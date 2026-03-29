from core.database import db

def get_graph_data():
    # Only fetch suspicious/high-risk nodes to keep it fast
    q_nodes = """
    MATCH (a:Account)
    WHERE a.suspicious = true OR a.risk_score > 50 OR a.ml_risk_score > 50
    RETURN a AS n, labels(a) AS node_labels
    LIMIT 200
    """
    nodes_res = db.query(q_nodes)
    
    node_list = []
    fetched_ids = set()
    
    for record in nodes_res:
        n = record['n']
        node_id = n.get('id', '')
        if node_id in fetched_ids: continue
        fetched_ids.add(node_id)
        
        node_labels = record.get('node_labels', [])
        node_type = "Person" if "Person" in node_labels else "Account"
        
        data = dict(n)
        data['type'] = node_type
        data['label'] = f"{data.get('bank', '')}\n*{node_id[-6:]}" if node_type == "Account" else data.get('name', '')
        
        node_list.append({
            "data": data,
            "classes": "suspicious" if n.get("suspicious") else ""
        })
    
    # Also grab Person nodes connected to those accounts
    if fetched_ids:
        q_persons = """
        MATCH (p:Person)-[:OWNS|DIRECTOR_OF]->(a:Account)
        WHERE a.id IN $ids
        RETURN p AS n, labels(p) AS node_labels
        LIMIT 100
        """
        person_res = db.query(q_persons, ids=list(fetched_ids))
        for record in person_res:
            n = record['n']
            node_id = n.get('id', '')
            if node_id in fetched_ids: continue
            fetched_ids.add(node_id)
            
            data = dict(n)
            data['type'] = "Person"
            data['label'] = data.get('name', '')
            
            node_list.append({
                "data": data,
                "classes": "pep" if n.get("pep") else ""
            })
    
    # Fetch edges connecting those specific fetched IDs
    q_edges = """
    MATCH (source)-[r]->(target)
    WHERE source.id IN $ids AND target.id IN $ids
    RETURN source.id AS src, target.id AS tgt, r, type(r) AS rel_type
    LIMIT 500
    """
    edges_res = db.query(q_edges, ids=list(fetched_ids))
    
    edge_list = []
    for record in edges_res:
        r = record['r']
        
        data = dict(r)
        data['source'] = record['src']
        data['target'] = record['tgt']
        data['rel_type'] = record['rel_type']
        
        data['id'] = r.get('id', f"{data['source']}_{data['target']}_{data['rel_type']}")
        
        classes = ""
        if r.get('suspicious'): classes += "suspicious "
        if record['rel_type'] == 'OWNS': classes += "owns"
        if record['rel_type'] == 'DIRECTOR_OF': classes += "director"
        
        edge_list.append({
            "data": data,
            "classes": classes.strip()
        })
        
    return {
        "nodes": node_list,
        "edges": edge_list
    }


def get_stats():
    q_stats = """
    MATCH (a:Account)
    WITH count(a) as accounts
    OPTIONAL MATCH ()-[t:TRANSACTION]->()
    WITH accounts, count(t) as transactions, 
         count(CASE WHEN t.suspicious THEN 1 END) as suspicious_txns,
         sum(CASE WHEN t.suspicious THEN t.amount ELSE 0 END) as total_suspicious_volume
    OPTIONAL MATCH (p:Person)
    RETURN accounts, transactions, suspicious_txns, 
           total_suspicious_volume, count(p) as persons
    """
    
    results = db.query(q_stats)
    if not results:
         return {
            "accounts": 0, "transactions": 0, "suspicious_txns": 0,
            "total_suspicious_volume": 0, "persons": 0,
            "max_risk_score": 0, "avg_risk_score": 0
        }
        
    res = results[0]
    return {
        "accounts": res['accounts'],
        "transactions": res['transactions'],
        "suspicious_txns": res['suspicious_txns'],
        "persons": res['persons'],
        "total_suspicious_volume": res['total_suspicious_volume'] or 0,
        "max_risk_score": 100,
        "avg_risk_score": 0
    }
