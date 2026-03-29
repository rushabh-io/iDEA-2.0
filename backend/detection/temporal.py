from core.database import db
from datetime import datetime


def detect_velocity():
    print("Running Temporal Velocity detection...")
    
    # Looking for multi-hop paths happening quickly
    query = """
    MATCH path = (start:Account)-[:TRANSACTION*2..5]->(end:Account)
    WHERE start <> end
      AND all(n in nodes(path) WHERE size([m in nodes(path) WHERE m=n]) = 1) // all distinct
    WITH path, relationships(path) as rels, nodes(path) as accounts
    WITH path, rels, accounts,
         [r in rels | r.date + ' ' + toString(r.hour) + ':00:00'] AS times
    RETURN [a in accounts | a.id] AS chain,
           length(path) AS hops,
           times,
           reduce(s = 0, r in rels | s + r.amount) AS total_amount
    """
    
    results = db.query(query)
    alerts = []
    
    for row in results:
        times = row['times']
        if not times or len(times) < 2:
            continue
            
        try:
            # Parse times to datetime
            parsed_times = [datetime.strptime(t, "%Y-%m-%d %H:%M:%S") for t in times]
            parsed_times.sort()
            
            first_txn = parsed_times[0]
            last_txn = parsed_times[-1]
            days_span = (last_txn - first_txn).days
            
            hops = row['hops']
            
            # Quick hops alert if span <= 7 days
            if days_span <= 7 and hops >= 2:
                risk = min(int(90 - days_span * 5), 100)
                chain = row['chain']
                
                update_query = """
                UNWIND $chain AS acc_id
                MATCH (a:Account {id: acc_id})
                SET a.velocity_flag = true,
                    a.suspicious = true,
                    a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END
                """
                db.query(update_query, chain=chain, risk=risk)
                
                alerts.append({
                    "type": "VELOCITY",
                    "chain": chain,
                    "hops": hops,
                    "days_span": days_span,
                    "total_amount": row['total_amount'],
                    "risk_score": risk,
                    "description": f"Rapid {hops}-hop transfer of ${row['total_amount']:,.2f} completed in {max(1, days_span)} days"
                })
        except Exception as e:
            print(f"Error parsing temporal data: {e}")
            continue
            
    # Sort and return top alerts (to prevent overwhelming list)
    alerts.sort(key=lambda x: x['risk_score'], reverse=True)
    top_alerts = alerts[:50]
    
    print(f"Found {len(alerts)} temporal velocity patterns, returning top {len(top_alerts)}.")
    return top_alerts
