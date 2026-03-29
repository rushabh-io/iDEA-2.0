from core.database import db


def detect_bipartite():
    print("Running Bipartite Network detection...")
    query = """
    MATCH (a:Account)-[:TRANSACTION]->(b:Account)
    WHERE a.bank <> b.bank
    WITH a.bank AS bank_a, b.bank AS bank_b, count(DISTINCT a) AS senders, count(DISTINCT b) AS receivers, count(*) AS total_txns
    WHERE senders >= 2 AND receivers >= 2 AND total_txns >= (senders * receivers)
    RETURN bank_a, bank_b, senders, receivers, total_txns
    ORDER BY total_txns DESC
    """
    
    results = db.query(query)
    alerts = []
    
    for row in results:
        bank_a = row['bank_a']
        bank_b = row['bank_b']
        total_txns = row['total_txns']
        
        risk = min(int(40 + total_txns * 3), 100)
        
        # Flag all accounts involved between those two banks
        update_query = """
        MATCH (a:Account {bank: $bank_a})-[t:TRANSACTION]->(b:Account {bank: $bank_b})
        SET a.suspicious = true, b.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END,
            b.risk_score = CASE WHEN b.risk_score > $risk THEN b.risk_score ELSE $risk END,
            t.suspicious = true, t.flag = 'BIPARTITE',
            t.risk_score = CASE WHEN t.risk_score > $risk THEN t.risk_score ELSE $risk END
        """
        db.query(update_query, bank_a=bank_a, bank_b=bank_b, risk=risk)
        
        alerts.append({
            "type": "BIPARTITE",
            "bank_a": bank_a,
            "bank_b": bank_b,
            "senders": row['senders'],
            "receivers": row['receivers'],
            "total_transactions": total_txns,
            "risk_score": risk,
            "description": f"Highly dense bipartite transaction graph between {bank_a} and {bank_b}"
        })
        
    print(f"Found {len(alerts)} bipartite network patterns.")
    return alerts


def detect_stack():
    print("Running Layered Stack detection...")
    query = """
    MATCH (a:Account)-[:TRANSACTION]->(b:Account)-[:TRANSACTION]->(c:Account)
    WHERE a.bank <> b.bank AND b.bank <> c.bank AND a.bank <> c.bank
    WITH a.bank AS bank_a, b.bank AS bank_b, c.bank AS bank_c, 
         count(DISTINCT a) AS layer1_nodes, 
         count(DISTINCT b) AS layer2_hubs, 
         count(DISTINCT c) AS layer3_nodes
    WHERE layer1_nodes >= 2 AND layer2_hubs >= 2 AND layer3_nodes >= 2
    RETURN bank_a, bank_b, bank_c, layer1_nodes, layer2_hubs, layer3_nodes
    ORDER BY layer2_hubs DESC
    """
    
    results = db.query(query)
    alerts = []
    
    for row in results:
        layer2_hubs = row['layer2_hubs']
        risk = min(int(60 + layer2_hubs * 5), 100)
        
        update_query = """
        MATCH (a:Account {bank: $bank_a})-[:TRANSACTION]->(b:Account {bank: $bank_b})-[:TRANSACTION]->(c:Account {bank: $bank_c})
        SET a.suspicious = true, b.suspicious = true, c.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END,
            b.risk_score = CASE WHEN b.risk_score > $risk THEN b.risk_score ELSE $risk END,
            c.risk_score = CASE WHEN c.risk_score > $risk THEN c.risk_score ELSE $risk END
        """
        db.query(update_query, bank_a=row['bank_a'], bank_b=row['bank_b'], bank_c=row['bank_c'], risk=risk)
        
        alerts.append({
            "type": "STACK",
            "layers": [row['bank_a'], row['bank_b'], row['bank_c']],
            "layer_counts": [row['layer1_nodes'], layer2_hubs, row['layer3_nodes']],
            "risk_score": risk,
            "description": f"3-tier structured forwarding stack via {layer2_hubs} intermediate hubs"
        })
        
    print(f"Found {len(alerts)} layered stack patterns.")
    return alerts
