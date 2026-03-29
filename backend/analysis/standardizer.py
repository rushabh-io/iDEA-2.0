"""
Bank Format Standardizer — auto-maps any bank CSV/JSON to the canonical
IBM AML format that our ML model expects.

Ported from bank_format_task/standardizer.py with imports fixed for
the backend package structure.
"""
from __future__ import annotations

import csv
import io
import json
import re
import warnings
from pathlib import Path
from typing import Any, Dict, Tuple

import pandas as pd

from analysis.schemas import CANONICAL_TRANSACTION_COLUMNS, ColumnMapping, StandardizationMetadata


AUTO_FIELD_ALIASES = {
    "Timestamp": ["timestamp", "txn_time", "posted_at", "transaction_date", "booking_time", "value_date"],
    "From Bank": ["from_bank", "source_bank", "origin_bank", "sender_bank", "debit_bank", "origin_bank_code", "sender_bic", "sender_swift", "origin_bic", "source_bic"],
    "Account": ["account", "from_account", "source_account", "origin_account", "sender_account", "debit_account", "origin_acct", "sender_acct", "sender_acct_no", "sender_account_no", "source_account_no", "origin_account_number", "senderacctno"],
    "To Bank": ["to_bank", "beneficiary_bank", "destination_bank", "receiver_bank", "credit_bank", "destination_bank_code", "beneficiary_bic", "beneficiary_swift", "destination_bic", "receiver_bic"],
    "Account.1": ["account_1", "to_account", "beneficiary_account", "destination_account", "receiver_account", "credit_account", "destination_acct", "beneficiary_acct", "beneficiary_acct_no", "beneficiary_account_no", "destination_account_number", "beneficiaryacctno"],
    "Amount Received": ["amount_received", "credit_amount", "received_amount", "incoming_amount", "credit_value"],
    "Receiving Currency": ["receiving_currency", "credit_currency", "received_currency", "incoming_currency", "credit_ccy"],
    "Amount Paid": ["amount_paid", "debit_amount", "amount", "outgoing_amount", "sent_amount", "txn_amount", "txnamt", "transaction_amount", "payment_amount", "debit_value"],
    "Payment Currency": ["payment_currency", "debit_currency", "currency", "outgoing_currency", "settlement_currency", "debit_ccy", "currency_code", "currencycode"],
    "Payment Format": ["payment_format", "payment_type", "payment_method", "transfer_channel", "channel", "payment_rail"],
    "Is Laundering": ["is_laundering", "laundering_flag", "suspicious_flag", "flagged", "is_fraud"],
}

DEFAULT_FIELD_VALUES = {
    "From Bank": "UNKNOWN_SOURCE_BANK",
    "To Bank": "UNKNOWN_TARGET_BANK",
    "Amount Received": None,
    "Payment Currency": "US Dollar",
    "Receiving Currency": None,
    "Payment Format": "unknown",
    "Is Laundering": 0,
}

NUMERIC_COLUMNS = {"Amount Received", "Amount Paid", "Is Laundering"}
CURRENCY_TOKENS = {
    "usd", "us dollar", "dollar", "eur", "euro", "gbp", "pound", "cad", "aud", "chf",
    "jpy", "yen", "cny", "yuan", "inr", "rupee", "rub", "ruble", "mxn", "peso",
    "brl", "real", "sar", "riyal", "ils", "shekel", "btc", "bitcoin",
}
FIELD_NAME_HINTS = {
    "Timestamp": {"timestamp": 5, "date": 3, "time": 3, "posted": 3, "booking": 3, "value": 2, "txn": 2, "transaction": 2},
    "From Bank": {"bank": 4, "bic": 4, "swift": 4, "institution": 2, "branch": 2, "source": 1, "origin": 1, "sender": 1, "debit": 1, "from": 1},
    "Account": {"account": 4, "acct": 4, "acctno": 4, "accountno": 4, "accno": 4, "iban": 4, "wallet": 3, "from": 2, "source": 3, "origin": 3, "sender": 3, "debit": 2},
    "To Bank": {"bank": 4, "bic": 4, "swift": 4, "institution": 2, "branch": 2, "to": 1, "target": 1, "destination": 1, "beneficiary": 1, "receiver": 1, "credit": 1},
    "Account.1": {"account": 4, "acct": 4, "acctno": 4, "accountno": 4, "accno": 4, "iban": 4, "wallet": 3, "to": 2, "target": 2, "destination": 3, "beneficiary": 3, "receiver": 3, "credit": 2},
    "Amount Received": {"amount": 1, "amt": 1, "value": 1, "received": 4, "credit": 4, "incoming": 3, "deposit": 2},
    "Receiving Currency": {"currency": 3, "ccy": 3, "curr": 2, "received": 3, "credit": 3, "incoming": 2},
    "Amount Paid": {"amount": 1, "amt": 1, "value": 1, "paid": 4, "debit": 4, "sent": 3, "outgoing": 3, "withdrawal": 2},
    "Payment Currency": {"currency": 3, "ccy": 3, "curr": 2, "payment": 2, "debit": 3, "settlement": 2},
    "Payment Format": {"format": 3, "type": 2, "method": 2, "channel": 3, "rail": 3, "network": 2},
    "Is Laundering": {"laundering": 5, "suspicious": 4, "fraud": 3, "flag": 3, "alert": 2, "risk": 2},
}
REQUIRED_FIELDS = {"Timestamp", "Account", "Account.1", "Amount Paid"}
RESOLUTION_ORDER = [
    "Timestamp", "From Bank", "Account", "To Bank", "Account.1",
    "Amount Paid", "Payment Currency", "Amount Received", "Receiving Currency",
    "Payment Format", "Is Laundering",
]


class StandardizationError(ValueError):
    pass


def normalize_column_name(value: object) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", str(value).strip().lower())
    return slug.strip("_")


def _read_delimited_text(content: bytes, delimiter: str | None = None, nrows: int | None = None) -> pd.DataFrame:
    text = content.decode("utf-8-sig", errors="replace")
    if delimiter:
        return pd.read_csv(io.StringIO(text), sep=delimiter, nrows=nrows)
    # If we only want a few rows, we can't easily sniff the whole file,
    # but 4096 bytes is usually enough for a header and some rows.
    sample = text[:4096]
    try:
        sniffed = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        return pd.read_csv(io.StringIO(text), sep=sniffed.delimiter, nrows=nrows)
    except csv.Error:
        return pd.read_csv(io.StringIO(text), sep=None, engine="python", nrows=nrows)


def _read_json_table(content: bytes) -> pd.DataFrame:
    payload = json.loads(content.decode("utf-8"))
    if isinstance(payload, list):
        return pd.json_normalize(payload)
    if isinstance(payload, dict):
        for key in ("transactions", "data", "rows", "items", "records"):
            value = payload.get(key)
            if isinstance(value, list):
                return pd.json_normalize(value)
        return pd.json_normalize([payload])
    raise StandardizationError("Unsupported JSON payload.")


def read_transactions_table(filename: str, content: bytes, delimiter: str | None = None, nrows: int | None = None) -> pd.DataFrame:
    suffix = Path(filename).suffix.lower()
    if suffix in {".csv", ".txt"}:
        return _read_delimited_text(content, delimiter=delimiter, nrows=nrows)
    if suffix == ".tsv":
        return _read_delimited_text(content, delimiter=delimiter or "\t", nrows=nrows)
    if suffix == ".xlsx":
        # For XLSX, nrows isn't directly supported by read_excel in the same way,
        # but we can handle it if needed. For now, we'll read it all or just skip optimization for binary.
        return pd.read_excel(io.BytesIO(content))
    if suffix == ".json":
        # JSON is hard to partial-read without a specialized parser, so we'll read it all.
        return _read_json_table(content)
    raise StandardizationError(f"Unsupported file type '{suffix}'. Upload CSV, TSV, XLSX, or JSON.")


def _name_score(column_name: str, canonical_field: str) -> float:
    normalized = normalize_column_name(column_name)
    score = 0.0
    for token, weight in FIELD_NAME_HINTS.get(canonical_field, {}).items():
        if token in normalized:
            score += weight
    return score


def _datetime_ratio(series: pd.Series) -> float:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        parsed = pd.to_datetime(series, errors="coerce")
    return float(parsed.notna().mean()) if len(parsed) else 0.0


def _numeric_ratio(series: pd.Series) -> float:
    parsed = _clean_numeric(series)
    return float(parsed.notna().mean()) if len(parsed) else 0.0


def _currency_ratio(series: pd.Series) -> float:
    values = series.astype("string").fillna("").str.strip().str.lower()
    non_empty = values[values != ""]
    if non_empty.empty:
        return 0.0
    return float(non_empty.map(lambda value: value in CURRENCY_TOKENS or len(value) == 3).mean())


def _boolean_ratio(series: pd.Series) -> float:
    values = series.astype("string").fillna("").str.strip().str.lower()
    non_empty = values[values != ""]
    if non_empty.empty:
        return 0.0
    allowed = {"0", "1", "true", "false", "yes", "no", "y", "n"}
    return float(non_empty.map(lambda value: value in allowed).mean())


def _string_uniqueness_ratio(series: pd.Series) -> float:
    values = series.astype("string").fillna("").str.strip()
    non_empty = values[values != ""]
    if non_empty.empty:
        return 0.0
    return float(non_empty.nunique() / max(len(non_empty), 1))


def _heuristic_score(frame: pd.DataFrame, column_name: str, canonical_field: str) -> float:
    series = frame[column_name]
    score = _name_score(column_name, canonical_field)
    if canonical_field == "Timestamp":
        score += _datetime_ratio(series) * 6
    elif canonical_field in {"Amount Paid", "Amount Received"}:
        score += _numeric_ratio(series) * 5
    elif canonical_field in {"Payment Currency", "Receiving Currency"}:
        score += _currency_ratio(series) * 5
    elif canonical_field == "Is Laundering":
        score += _boolean_ratio(series) * 5
    elif canonical_field in {"Account", "Account.1"}:
        score += _string_uniqueness_ratio(series) * 2
        score += 1.0 if series.astype("string").str.contains(r"\d", regex=True, na=False).mean() >= 0.6 else 0.0
    elif canonical_field in {"From Bank", "To Bank"}:
        score += 1.0 if series.astype("string").str.len().mean() >= 3 else 0.0
        score += (1 - min(_string_uniqueness_ratio(series), 1.0)) * 1.5
    elif canonical_field == "Payment Format":
        score += 1.0 if _string_uniqueness_ratio(series) <= 0.6 else 0.0
    return score


def _heuristic_threshold(canonical_field: str) -> float:
    if canonical_field == "Timestamp":
        return 4.0
    if canonical_field in {"From Bank", "To Bank"}:
        return 4.0
    if canonical_field in {"Amount Paid", "Amount Received", "Payment Currency", "Receiving Currency"}:
        return 3.0
    if canonical_field == "Is Laundering":
        return 3.5
    return 2.5


def _resolve_source_column(frame: pd.DataFrame, canonical_field: str, mapping: ColumnMapping, used_columns: set) -> str | None:
    if canonical_field in mapping.fields:
        configured = mapping.fields[canonical_field]
        if configured in frame.columns:
            return configured
        normalized_lookup = {normalize_column_name(col): col for col in frame.columns}
        return normalized_lookup.get(normalize_column_name(configured))

    normalized_lookup = {normalize_column_name(col): col for col in frame.columns}
    for alias in AUTO_FIELD_ALIASES.get(canonical_field, []):
        if alias in frame.columns:
            return alias
        normalized = normalized_lookup.get(normalize_column_name(alias))
        if normalized:
            return normalized

    best_column = None
    best_score = float("-inf")
    for column in frame.columns:
        if column in used_columns:
            continue
        score = _heuristic_score(frame, column, canonical_field)
        if score > best_score:
            best_score = score
            best_column = column

    if best_column is not None and best_score >= _heuristic_threshold(canonical_field):
        return best_column
    return None


def _clean_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.astype("string").str.replace(",", "", regex=False).str.replace(r"[^\d.\-]", "", regex=True),
        errors="coerce",
    )


def standardize_transactions(frame: pd.DataFrame, mapping: ColumnMapping | None = None) -> Tuple[pd.DataFrame, StandardizationMetadata]:
    mapping = mapping or ColumnMapping()
    standardized = pd.DataFrame(index=frame.index)
    resolved_fields: Dict[str, str] = {}
    applied_defaults: Dict[str, Any] = {}
    missing_required: list = []
    used_columns: set = set()

    for canonical_field in RESOLUTION_ORDER:
        source_column = _resolve_source_column(frame, canonical_field, mapping, used_columns)
        if source_column is not None:
            standardized[canonical_field] = frame[source_column]
            resolved_fields[canonical_field] = source_column
            used_columns.add(source_column)
            continue

        fallback_field = {
            "To Bank": "From Bank",
            "Receiving Currency": "Payment Currency",
        }.get(canonical_field)
        if fallback_field and fallback_field in standardized.columns:
            standardized[canonical_field] = standardized[fallback_field]
            applied_defaults[canonical_field] = f"copied_from_{fallback_field}"
            continue

        default_value = mapping.defaults.get(canonical_field, DEFAULT_FIELD_VALUES.get(canonical_field))
        if default_value is not None:
            standardized[canonical_field] = default_value
            applied_defaults[canonical_field] = default_value
            continue

        if canonical_field in REQUIRED_FIELDS:
            missing_required.append(canonical_field)
        else:
            standardized[canonical_field] = ""

    if missing_required:
        raise StandardizationError(
            "Could not infer enough transaction columns. "
            f"Missing required fields: {missing_required}. "
            f"Detected input columns: {[str(c) for c in frame.columns]}. "
            "Try a custom mapping JSON if this bank uses unusual headers."
        )

    if "Amount Received" in standardized.columns:
        standardized["Amount Received"] = standardized["Amount Received"].where(
            standardized["Amount Received"].notna() & (standardized["Amount Received"] != ""),
            standardized["Amount Paid"],
        )
    if "Receiving Currency" in standardized.columns:
        standardized["Receiving Currency"] = standardized["Receiving Currency"].where(
            standardized["Receiving Currency"].notna() & (standardized["Receiving Currency"] != ""),
            standardized["Payment Currency"],
        )

    for column in NUMERIC_COLUMNS:
        standardized[column] = _clean_numeric(standardized[column])

    for column in ["From Bank", "Account", "To Bank", "Account.1", "Receiving Currency", "Payment Currency", "Payment Format"]:
        standardized[column] = standardized[column].astype("string").fillna("").str.strip()

    standardized["Timestamp"] = standardized["Timestamp"].astype("string").fillna("").str.strip()
    standardized = standardized.dropna(subset=["Amount Paid"])
    standardized = standardized[standardized["Timestamp"] != ""]
    standardized = standardized.reset_index(drop=True)

    if standardized.empty:
        raise StandardizationError(
            "No usable transaction rows remained after cleaning. "
            "Check timestamp and amount columns or provide a custom mapping."
        )

    unmapped_input_columns = [
        col for col in frame.columns if col not in set(resolved_fields.values())
    ]

    metadata = StandardizationMetadata(
        input_columns=[str(c) for c in frame.columns],
        standardized_columns=CANONICAL_TRANSACTION_COLUMNS,
        resolved_fields=resolved_fields,
        applied_defaults=applied_defaults,
        unmapped_input_columns=unmapped_input_columns,
        record_count=len(standardized),
    )
    return standardized, metadata
