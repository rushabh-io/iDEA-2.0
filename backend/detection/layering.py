from core.database import db


def calculate_layering_scores():
    print("Running Ownership Layering detection...")
    
    # Look for complex structural ownership
    query = """
    MATCH path = (p:Person)-[:OWNS*1..6]->(a:Account)
    WITH a, count(DISTINCT p) AS owner_count, max(length(path)) AS max_depth
    WHERE max_depth >= 2
    RETURN a.id AS account_id, owner_count, max_depth
    ORDER BY max_depth DESC
    """
    
    results = db.query(query)
    alerts = []
    
    for row in results:
        max_depth = row['max_depth']
        owner_count = row['owner_count']
        
        # Risk scales with depth of ownership
        risk = min(int(max_depth * 20 + 10), 100)
        
        update_query = """
        MATCH (a:Account {id: $account_id})
        SET a.layering_score = $risk,
            a.ownership_depth = $max_depth,
            a.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END
        """
        db.query(update_query, account_id=row['account_id'], max_depth=max_depth, risk=risk)
        
        alerts.append({
            "type": "LAYERING",
            "account_id": row['account_id'],
            "ownership_depth": max_depth,
            "owner_count": owner_count,
            "layering_score": risk,
            "description": f"Complex corporate entity nesting: {max_depth} layers deep with {owner_count} UBOs"
        })
        
    print(f"Found {len(alerts)} layered corporate structures.")
    return alerts
