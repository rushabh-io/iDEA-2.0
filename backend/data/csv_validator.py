"""
CSV Validator — format detection, auto-mapping, and validation.
"""

IBM_COLUMNS = [
    'Timestamp', 'From Bank', 'From Account',
    'To Bank', 'To Account', 'Amount Received',
    'Receiving Currency', 'Amount Paid',
    'Payment Currency', 'Payment Format', 'Is Laundering'
]

REQUIRED_NEXARA_FIELDS = ['from_account', 'to_account', 'amount']

OPTIONAL_NEXARA_FIELDS = [
    'date', 'currency', 'transaction_type',
    'is_laundering', 'from_bank', 'to_bank'
]

FROM_ALIASES = [
    'from account', 'from_account', 'sender_id',
    'sender', 'source', 'from', 'originator',
    'payer', 'account_from'
]
TO_ALIASES = [
    'to account', 'to_account', 'receiver_id',
    'receiver', 'destination', 'to', 'beneficiary',
    'payee', 'account_to'
]
AMOUNT_ALIASES = [
    'amount paid', 'amount', 'value',
    'transaction_amount', 'amt', 'sum',
    'transfer_amount', 'payment_amount'
]
DATE_ALIASES = [
    'timestamp', 'date', 'transaction_date',
    'datetime', 'created_at', 'txn_date', 'time'
]
LABEL_ALIASES = [
    'is laundering', 'is_laundering', 'is_fraud',
    'is_suspicious', 'label', 'fraud', 'suspicious',
    'laundering', 'ground_truth'
]
CURRENCY_ALIASES = [
    'payment currency', 'payment_currency',
    'currency', 'ccy', 'curr'
]
FROM_BANK_ALIASES = [
    'from bank', 'from_bank', 'sender_bank',
    'source_bank', 'originating_bank'
]
TO_BANK_ALIASES = [
    'to bank', 'to_bank', 'receiver_bank',
    'destination_bank', 'beneficiary_bank'
]


def detect_format(columns: list) -> str:
    columns_lower = [c.lower().strip() for c in columns]
    if all(c in columns_lower for c in ['from bank', 'from account', 'is laundering']):
        return 'ibm'
    if any(c in columns_lower for c in ['sender_id', 'from_account', 'source', 'from']):
        return 'simple'
    return 'custom'


def auto_map_columns(columns: list) -> dict:
    cols_lower = {c.lower().strip(): c for c in columns}

    def find_match(aliases):
        for alias in aliases:
            if alias in cols_lower:
                return cols_lower[alias]
        return None

    mapping = {
        'from_account': find_match(FROM_ALIASES),
        'to_account': find_match(TO_ALIASES),
        'amount': find_match(AMOUNT_ALIASES),
        'date': find_match(DATE_ALIASES),
        'is_laundering': find_match(LABEL_ALIASES),
        'currency': find_match(CURRENCY_ALIASES),
        'from_bank': find_match(FROM_BANK_ALIASES),
        'to_bank': find_match(TO_BANK_ALIASES),
    }

    return {k: v for k, v in mapping.items() if v is not None}


def validate_mapping(mapping: dict) -> dict:
    errors = []
    warnings = []

    if not mapping.get('from_account'):
        errors.append("Missing required field: sender account ID")
    if not mapping.get('to_account'):
        errors.append("Missing required field: receiver account ID")
    if not mapping.get('amount'):
        errors.append("Missing required field: transaction amount")
    if not mapping.get('date'):
        warnings.append("No date column mapped — today's date will be used")
    if not mapping.get('is_laundering'):
        warnings.append("No label column mapped — validation metrics unavailable")
    if not mapping.get('currency'):
        warnings.append("No currency column — USD will be assumed")

    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }
