from core.database import db


def detect_fan_out(min_targets=5):
    print("Running Fan-Out detection...")
    query = """
    MATCH (source:Account)-[t:TRANSACTION]->(target:Account)
    WITH source, count(DISTINCT target) AS target_count, sum(t.amount) AS total_amount
    WHERE target_count >= $min_targets
    RETURN source.id AS account_id, source.bank AS bank, 
           target_count, total_amount
    ORDER BY target_count DESC
    """
    
    results = db.query(query, min_targets=min_targets)
    alerts = []
    
    for row in results:
        target_count = row['target_count']
        risk = min(int(30 + target_count * 8), 100)
        
        update_query = """
        MATCH (a:Account {id: $account_id})
        SET a.fan_out_flag = true,
            a.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END
        """
        db.query(update_query, account_id=row['account_id'], risk=risk)
        
        alerts.append({
            "type": "FAN_OUT",
            "account_id": row['account_id'],
            "bank": row['bank'],
            "target_count": target_count,
            "total_amount": row['total_amount'],
            "risk_score": risk,
            "description": f"Source dispersed funds to {target_count} distinct accounts"
        })
        
    print(f"Found {len(alerts)} fan-out patterns.")
    return alerts


def detect_fan_in(min_sources=5):
    print("Running Fan-In detection...")
    query = """
    MATCH (source:Account)-[t:TRANSACTION]->(target:Account)
    WITH target, count(DISTINCT source) AS source_count, sum(t.amount) AS total_received
    WHERE source_count >= $min_sources
    RETURN target.id AS account_id, target.bank AS bank,
           source_count, total_received
    ORDER BY source_count DESC
    """
    
    results = db.query(query, min_sources=min_sources)
    alerts = []
    
    for row in results:
        source_count = row['source_count']
        risk = min(int(30 + source_count * 8), 100)
        
        update_query = """
        MATCH (a:Account {id: $account_id})
        SET a.fan_in_flag = true,
            a.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END
        """
        db.query(update_query, account_id=row['account_id'], risk=risk)
        
        alerts.append({
            "type": "FAN_IN",
            "account_id": row['account_id'],
            "bank": row['bank'],
            "source_count": source_count,
            "total_received": row['total_received'],
            "risk_score": risk,
            "description": f"Target amassed funds from {source_count} distinct accounts"
        })
        
    print(f"Found {len(alerts)} fan-in patterns.")
    return alerts
