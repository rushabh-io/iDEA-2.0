import statistics
from core.database import db


def detect_anomalies():
    print("Running Statistical Anomaly detection...")
    
    # Get all transaction amounts to establish baseline
    query = "MATCH ()-[t:TRANSACTION]->() RETURN t.amount AS amount"
    results = db.query(query)
    
    if not results:
        print("No transactions found for anomaly detection.")
        return []
        
    amounts = [r['amount'] for r in results]
    
    if len(amounts) < 2:
        return []
        
    mean = statistics.mean(amounts)
    try:
        stdev = statistics.stdev(amounts)
    except statistics.StatisticsError:
        print("Not enough variance for stdev calculation.")
        return []
        
    if stdev == 0:
        return []
        
    # Find outliers
    outlier_query = """
    MATCH (a:Account)-[t:TRANSACTION]->()
    WHERE t.amount > $threshold
    RETURN a.id AS account_id, t.id AS tx_id, t.amount AS amount
    ORDER BY t.amount DESC
    LIMIT 20
    """
    
    # Threshold at 2.5 standard deviations above mean
    threshold = mean + (2.5 * stdev)
    outliers = db.query(outlier_query, threshold=threshold)
    
    alerts = []
    
    for row in outliers:
        amount = row['amount']
        z_score = abs((amount - mean) / stdev)
        risk = min(int(z_score * 20), 100)
        
        update_query = """
        MATCH (a:Account {id: $account_id})-[t:TRANSACTION {id: $tx_id}]->()
        SET a.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END,
            t.suspicious = true,
            t.flag = 'ANOMALY',
            t.risk_score = CASE WHEN t.risk_score > $risk THEN t.risk_score ELSE $risk END
        """
        db.query(update_query, account_id=row['account_id'], tx_id=row['tx_id'], risk=risk)
        
        alerts.append({
            "type": "ANOMALY",
            "account_id": row['account_id'],
            "amount": amount,
            "z_score": round(z_score, 2),
            "risk_score": risk,
            "description": f"Statistical outlier transaction: ${amount:,.2f} ({z_score:.1f}x stdev above mean)"
        })
        
    print(f"Found {len(alerts)} statistical anomalies.")
    return alerts
