import pandas as pd
from datetime import datetime
from typing import Optional, List, Dict


class AnalysisSession:
    def __init__(self):
        self.active: bool = False
        self.filename: Optional[str] = None
        self.uploaded_at: Optional[datetime] = None
        self.df: Optional[pd.DataFrame] = None  # internal format
        self.std_df: Optional[pd.DataFrame] = None  # standardized canonical format
        self.accounts: List[Dict] = []
        self.transactions: List[Dict] = []
        self.detection_results: Dict = {}
        self.stats: Dict = {}
        self.format_detected: Optional[str] = None
        self.has_labels: bool = False
        self.total_rows: int = 0
        self.fraud_rows: int = 0
        self.standardization_metadata: Optional[Dict] = None
        self.ml_predictions: Optional[Dict] = None


_session = AnalysisSession()


def get_session() -> AnalysisSession:
    return _session


def start_session(
    filename: str,
    std_df: pd.DataFrame,
    format_detected: str,
    metadata: dict = None
) -> None:
    _session.active = True
    _session.filename = filename
    _session.uploaded_at = datetime.now()
    _session.std_df = std_df
    _session.format_detected = format_detected
    _session.standardization_metadata = metadata

    # Build internal format from standardized data
    internal_df = pd.DataFrame()
    internal_df['from_acc'] = std_df['Account'].astype(str)
    internal_df['to_acc'] = std_df['Account.1'].astype(str)
    internal_df['amount'] = pd.to_numeric(std_df['Amount Paid'], errors='coerce').fillna(0)
    internal_df['timestamp'] = std_df['Timestamp'].astype(str)
    internal_df['from_bank'] = std_df['From Bank'].astype(str)
    internal_df['to_bank'] = std_df['To Bank'].astype(str)
    internal_df['currency'] = std_df['Payment Currency'].astype(str)
    internal_df['payment_format'] = std_df['Payment Format'].astype(str)

    if 'Is Laundering' in std_df.columns:
        internal_df['is_fraud'] = pd.to_numeric(std_df['Is Laundering'], errors='coerce').fillna(0).astype(int)
    else:
        internal_df['is_fraud'] = 0

    _session.df = internal_df
    _session.total_rows = len(internal_df)
    _session.has_labels = 'is_fraud' in internal_df.columns and internal_df['is_fraud'].sum() > 0
    _session.fraud_rows = int(internal_df['is_fraud'].sum()) if 'is_fraud' in internal_df.columns else 0

    _session.accounts = _extract_accounts(internal_df)
    _session.transactions = _extract_transactions(internal_df)
    _session.detection_results = {}
    _session.stats = _compute_stats(internal_df)
    _session.ml_predictions = None


def stop_session() -> None:
    _session.active = False
    _session.filename = None
    _session.uploaded_at = None
    _session.df = None
    _session.std_df = None
    _session.accounts = []
    _session.transactions = []
    _session.detection_results = {}
    _session.stats = {}
    _session.format_detected = None
    _session.has_labels = False
    _session.total_rows = 0
    _session.fraud_rows = 0
    _session.standardization_metadata = None
    _session.ml_predictions = None


def is_active() -> bool:
    return _session.active


def set_detection_results(results: Dict) -> None:
    _session.detection_results = results


def set_ml_predictions(predictions: Dict) -> None:
    _session.ml_predictions = predictions

    # Update account risk scores from ML predictions
    if predictions and 'predictions' in predictions:
        ml_map = {p['account_id']: p for p in predictions['predictions']}
        for acc in _session.accounts:
            if acc['id'] in ml_map:
                pred = ml_map[acc['id']]
                acc['ml_risk_score'] = pred['ml_risk_score']
                acc['ml_prediction'] = pred['ml_prediction']
                acc['risk_score'] = max(acc.get('risk_score', 0), pred['ml_risk_score'])


def _extract_accounts(df: pd.DataFrame) -> List[Dict]:
    from_accs = df[['from_acc', 'from_bank']].rename(
        columns={'from_acc': 'id', 'from_bank': 'bank'}
    )
    to_accs = df[['to_acc', 'to_bank']].rename(
        columns={'to_acc': 'id', 'to_bank': 'bank'}
    )
    accounts = pd.concat([from_accs, to_accs], ignore_index=True)
    accounts = accounts.drop_duplicates(subset=['id'])

    if 'is_fraud' in df.columns:
        suspicious_ids = set(
            df[df['is_fraud'] == 1]['from_acc'].tolist() +
            df[df['is_fraud'] == 1]['to_acc'].tolist()
        )
    else:
        suspicious_ids = set()

    result = []
    for _, row in accounts.iterrows():
        result.append({
            'id': str(row['id']),
            'bank': str(row.get('bank', 'BANK_001')),
            'name': f"Account {str(row['id'])[:8]}",
            'type': 'Account',
            'suspicious': str(row['id']) in suspicious_ids,
            'risk_score': 0,
            'pep_connected': False,
            'velocity_flag': False,
            'fan_out_flag': False,
            'fan_in_flag': False,
            'gather_scatter_flag': False,
            'codirector_flag': False,
            'country': 'Unknown',
            'fatf_risk': 'UNKNOWN',
            'ml_risk_score': 0,
            'ml_prediction': 'UNKNOWN',
            'source': 'csv_upload'
        })
    return result


def _extract_transactions(df: pd.DataFrame) -> List[Dict]:
    result = []
    for idx, row in df.iterrows():
        result.append({
            'id': f"CSV_TXN_{idx}",
            'source': str(row['from_acc']),
            'target': str(row['to_acc']),
            'from_bank': str(row.get('from_bank', 'BANK_001')),
            'to_bank': str(row.get('to_bank', 'BANK_001')),
            'amount': float(row.get('amount', 0)),
            'currency': str(row.get('currency', 'USD')),
            'payment_format': str(row.get('payment_format', 'Wire')),
            'date': str(row.get('timestamp', '')),
            'is_laundering': int(row.get('is_fraud', 0)),
            'suspicious': bool(row.get('is_fraud', 0)),
            'risk_score': 100 if row.get('is_fraud', 0) == 1 else 0,
            'flag': '',
            'rel_type': 'TRANSACTION'
        })
    return result


def _compute_stats(df: pd.DataFrame) -> Dict:
    total = len(df)
    accounts = len(
        set(df['from_acc'].tolist() + df['to_acc'].tolist())
    )
    fraud = int(df['is_fraud'].sum()) if 'is_fraud' in df.columns else 0
    total_volume = float(df['amount'].sum()) if 'amount' in df.columns else 0
    suspicious_volume = 0.0
    if 'is_fraud' in df.columns and 'amount' in df.columns:
        suspicious_volume = float(df[df['is_fraud'] == 1]['amount'].sum())

    return {
        'total_transactions': total,
        'total_accounts': accounts,
        'fraud_transactions': fraud,
        'clean_transactions': total - fraud,
        'total_volume': round(total_volume, 2),
        'suspicious_volume': round(suspicious_volume, 2),
        'fraud_ratio_pct': round(fraud / total * 100, 2) if total > 0 else 0
    }
