from core.database import db
from data.ibm_preprocessor import load_and_sample, extract_accounts
from data.pattern_parser import parse_patterns


def clear_database():
    print("Clearing database...")
    db.query("MATCH (n) DETACH DELETE n")


def create_indexes():
    print("Creating indexes...")
    db.query("CREATE INDEX account_id IF NOT EXISTS FOR (a:Account) ON (a.id)")


def load_accounts_batch(accounts_df, batch_size=500):
    print(f"Loading {len(accounts_df)} accounts in batches of {batch_size}...")
    
    query = """
    UNWIND $batch AS row
    MERGE (a:Account {id: row.id})
    SET a.bank = row.bank,
        a.name = 'Account ' + row.id,
        a.suspicious = false,
        a.risk_score = 0,
        a.pep_connected = false,
        a.velocity_flag = false,
        a.codirector_flag = false,
        a.fan_out_flag = false,
        a.fan_in_flag = false,
        a.gather_scatter_flag = false,
        a.scatter_gather_flag = false,
        a.layering_score = 0,
        a.ownership_depth = 0,
        a.ml_risk_score = 0,
        a.ml_prediction = 'UNKNOWN'
    """
    
    records = []
    for _, row in accounts_df.iterrows():
        records.append({
            'id': str(row['account_id']),
            'bank': str(row['bank'])
        })
        
        if len(records) >= batch_size:
            db.query(query, batch=records)
            records = []
            
    if records:
        db.query(query, batch=records)


def load_transactions_batch(df, batch_size=500):
    print(f"Loading {len(df)} transactions in batches of {batch_size}...")
    
    query = """
    UNWIND $batch AS row
    MATCH (from:Account {id: row.from_account}), (to:Account {id: row.to_account})
    CREATE (from)-[t:TRANSACTION {
        id: 'TXN_' + toString(row.index),
        amount: toFloat(row.amount_paid),
        currency: row.payment_currency,
        payment_format: row.payment_format,
        date: row.date_string,
        hour: toInteger(row.hour),
        is_laundering: toInteger(row.is_laundering),
        suspicious: row.suspicious,
        risk_score: row.risk_score,
        flag: ''
    }]->(to)
    """
    
    records = []
    for idx, row in df.iterrows():
        records.append({
            'index': idx,
            'from_account': str(row['from_account']),
            'to_account': str(row['to_account']),
            'amount_paid': row['amount_paid'],
            'payment_currency': row['payment_currency'],
            'payment_format': row['payment_format'],
            'date_string': row['date_string'],
            'hour': row['hour_int'],
            'is_laundering': row['is_laundering'],
            'suspicious': bool(row['is_laundering']),
            'risk_score': 100 if row['is_laundering'] else 0
        })
        
        if len(records) >= batch_size:
            db.query(query, batch=records)
            records = []
            
    if records:
        db.query(query, batch=records)


def load_pattern_labels(account_patterns):
    print(f"Loading pattern labels for {len(account_patterns)} accounts into Neo4j...")
    
    query = """
    UNWIND $batch AS row
    MATCH (a:Account {id: row.account_id})
    SET a.patterns = row.patterns,
        a.pattern_count = size(row.patterns),
        a.suspicious = true
    """
    
    records = []
    for acc_id, (patterns) in account_patterns.items():
        records.append({
            'account_id': str(acc_id),
            'patterns': patterns
        })
        
        if len(records) >= 500:
            db.query(query, batch=records)
            records = []
            
    if records:
        db.query(query, batch=records)

def run_full_load(csv_path):
    print("Starting full data load...")
    df = load_and_sample(csv_path)
    
    if df.empty:
        return {"accounts": 0, "transactions": 0, "laundering_transactions": 0}
        
    clear_database()
    create_indexes()
    
    accounts_df = extract_accounts(df)
    load_accounts_batch(accounts_df)
    
    load_transactions_batch(df)
    
    # Load pattern labels
    pattern_path = csv_path.replace('HI-Small_Trans.csv', 'HI-Small_Patterns.txt')
    account_patterns = parse_patterns(pattern_path)
    if account_patterns:
        load_pattern_labels(account_patterns)
    
    laundering_count = len(df[df['is_laundering'] == 1])
    
    return {
        "accounts": len(accounts_df),
        "transactions": len(df),
        "laundering_transactions": laundering_count
    }
