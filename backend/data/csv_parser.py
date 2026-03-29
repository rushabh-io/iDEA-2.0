"""
CSV Parser — parse uploaded CSV into the exact DataFrame format
that neo4j_loader.load_transactions_batch() and extract_accounts() expect.
"""
import pandas as pd
import numpy as np
import io
from datetime import datetime
from data.csv_validator import detect_format, auto_map_columns
from data.neo4j_loader import clear_database, create_indexes, load_accounts_batch, load_transactions_batch
from data.hybrid_loader import add_synthetic_ownership_layer
from data.ibm_preprocessor import extract_accounts


def parse_csv_to_dataframe(file_content: bytes, filename: str, column_mapping: dict = None) -> dict:
    """
    Parse uploaded CSV bytes into the standardized DataFrame format
    expected by neo4j_loader (columns: from_account, to_account,
    amount_paid, payment_currency, payment_format, date_string,
    hour_int, is_laundering, from_bank, to_bank).
    """
    try:
        df_raw = pd.read_csv(io.BytesIO(file_content))
    except Exception as e:
        raise ValueError(f"Cannot parse CSV: {str(e)}")

    if df_raw.empty:
        raise ValueError("CSV file is empty")

    if len(df_raw.columns) < 3:
        raise ValueError("CSV must have at least 3 columns: sender, receiver, amount")

    fmt = detect_format(list(df_raw.columns))

    if fmt == 'ibm':
        df = _parse_ibm_format(df_raw)
    else:
        mapping = column_mapping or auto_map_columns(list(df_raw.columns))
        df = _parse_with_mapping(df_raw, mapping)

    preview = df.head(5).to_dict('records')
    fraud_count = int(df['is_laundering'].sum()) if 'is_laundering' in df.columns else 0

    return {
        'dataframe': df,
        'format_detected': fmt,
        'mapping_used': column_mapping or {},
        'row_count': len(df),
        'fraud_count': fraud_count,
        'column_count': len(df.columns),
        'preview': preview,
        'accounts_count': len(set(df['from_account'].tolist() + df['to_account'].tolist()))
    }


def _parse_ibm_format(df_raw: pd.DataFrame) -> pd.DataFrame:
    """Parse IBM AML dataset format into the standard schema."""
    df = pd.DataFrame()
    df['from_account'] = df_raw['From Account'].astype(str)
    df['to_account'] = df_raw['To Account'].astype(str)
    df['from_bank'] = df_raw['From Bank'].astype(str)
    df['to_bank'] = df_raw['To Bank'].astype(str)
    df['amount_paid'] = pd.to_numeric(df_raw['Amount Paid'], errors='coerce').fillna(0)
    df['payment_currency'] = df_raw.get('Payment Currency', pd.Series(['USD'] * len(df_raw))).astype(str)
    df['payment_format'] = df_raw.get('Payment Format', pd.Series(['Wire'] * len(df_raw))).astype(str)
    df['is_laundering'] = pd.to_numeric(df_raw.get('Is Laundering', 0), errors='coerce').fillna(0).astype(int)

    if 'Timestamp' in df_raw.columns:
        try:
            dates = pd.to_datetime(df_raw['Timestamp'], errors='coerce')
            df['date_string'] = dates.dt.strftime('%Y-%m-%d').fillna(datetime.now().strftime('%Y-%m-%d'))
            df['hour_int'] = dates.dt.hour.fillna(0).astype(int)
        except Exception:
            df['date_string'] = datetime.now().strftime('%Y-%m-%d')
            df['hour_int'] = 0
    else:
        df['date_string'] = datetime.now().strftime('%Y-%m-%d')
        df['hour_int'] = 0

    df = df.dropna(subset=['from_account', 'to_account'])
    df = df[df['from_account'] != df['to_account']]
    df = df[df['amount_paid'] > 0]
    return df.reset_index(drop=True)


def _parse_with_mapping(df_raw: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    """Parse any CSV using a column mapping dict into the standard schema."""
    df = pd.DataFrame()

    df['from_account'] = df_raw[mapping['from_account']].astype(str)
    df['to_account'] = df_raw[mapping['to_account']].astype(str)
    df['amount_paid'] = pd.to_numeric(df_raw[mapping['amount']], errors='coerce').fillna(0)

    df['from_bank'] = df_raw[mapping['from_bank']].astype(str) if mapping.get('from_bank') else 'BANK_001'
    df['to_bank'] = df_raw[mapping['to_bank']].astype(str) if mapping.get('to_bank') else 'BANK_001'

    if mapping.get('date'):
        try:
            dates = pd.to_datetime(df_raw[mapping['date']], errors='coerce')
            df['date_string'] = dates.dt.strftime('%Y-%m-%d').fillna(datetime.now().strftime('%Y-%m-%d'))
            df['hour_int'] = dates.dt.hour.fillna(0).astype(int)
        except Exception:
            df['date_string'] = datetime.now().strftime('%Y-%m-%d')
            df['hour_int'] = 0
    else:
        df['date_string'] = datetime.now().strftime('%Y-%m-%d')
        df['hour_int'] = 0

    df['payment_currency'] = df_raw[mapping['currency']].astype(str) if mapping.get('currency') else 'USD'
    df['payment_format'] = df_raw[mapping['transaction_type']].astype(str) if mapping.get('transaction_type') else 'Wire'

    if mapping.get('is_laundering'):
        df['is_laundering'] = pd.to_numeric(df_raw[mapping['is_laundering']], errors='coerce').fillna(0).astype(int)
    else:
        df['is_laundering'] = 0

    df = df.dropna(subset=['from_account', 'to_account'])
    df = df[df['from_account'] != df['to_account']]
    df = df[df['amount_paid'] > 0]
    return df.reset_index(drop=True)


def load_csv_into_neo4j(parsed_result: dict) -> dict:
    """
    Takes parsed result from parse_csv_to_dataframe().
    Clears Neo4j and loads the new data.
    Adds synthetic ownership layer on top.
    """
    df = parsed_result['dataframe']

    print("Clearing existing Neo4j data...")
    clear_database()
    create_indexes()

    accounts_df = extract_accounts(df)
    print(f"Loading {len(accounts_df)} accounts...")
    load_accounts_batch(accounts_df)

    print(f"Loading {len(df)} transactions...")
    load_transactions_batch(df)

    print("Adding synthetic ownership layer...")
    add_synthetic_ownership_layer(accounts_df)

    return {
        'accounts_loaded': len(accounts_df),
        'transactions_loaded': len(df),
        'laundering_transactions': int(df['is_laundering'].sum()),
        'format': parsed_result['format_detected'],
        'has_labels': parsed_result['fraud_count'] > 0
    }
