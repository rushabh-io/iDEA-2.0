from core.database import db

THRESHOLD = 10000
LOWER = 8500


def detect_smurfing():
    print("Running Smurfing detection...")
    query = """
    MATCH (a:Account)-[t:TRANSACTION]->(b:Account)
    WHERE t.amount >= $lower AND t.amount < $threshold
    WITH a, count(t) AS txn_count, sum(t.amount) AS total_value, collect(t.amount) AS amounts, collect(t.id) AS tx_ids
    WHERE txn_count >= 3
    RETURN a.id AS account_id, a.bank AS bank, txn_count, total_value, amounts, tx_ids
    ORDER BY txn_count DESC
    """
    
    results = db.query(query, lower=LOWER, threshold=THRESHOLD)
    alerts = []
    
    for row in results:
        txn_count = row['txn_count']
        risk = min(int(40 + txn_count * 10), 100)
        
        update_query = """
        MATCH (a:Account {id: $account_id})
        SET a.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END
        WITH a
        UNWIND $tx_ids AS tx_id
        MATCH (a)-[t:TRANSACTION {id: tx_id}]->()
        SET t.suspicious = true, t.flag = 'SMURFING',
            t.risk_score = CASE WHEN t.risk_score > $risk THEN t.risk_score ELSE $risk END
        """
        db.query(update_query, account_id=row['account_id'], tx_ids=row['tx_ids'], risk=risk)
        
        alerts.append({
            "type": "SMURFING",
            "account_id": row['account_id'],
            "bank": row['bank'],
            "transaction_count": txn_count,
            "total_value": row['total_value'],
            "amounts": row['amounts'],
            "risk_score": risk,
            "description": f"Detected {txn_count} transactions just below the $10,000 reporting threshold"
        })
        
    print(f"Found {len(alerts)} smurfing patterns.")
    return alerts
