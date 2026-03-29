from core.database import db


def detect_gather_scatter():
    print("Running Gather-Scatter detection...")
    query = """
    MATCH (source:Account)-[:TRANSACTION]->(hub:Account)-[:TRANSACTION]->(dest:Account)
    WITH hub, count(DISTINCT source) AS sources, count(DISTINCT dest) AS destinations
    WHERE sources >= 3 AND destinations >= 3
    RETURN hub.id AS hub_id, hub.bank AS bank, sources, destinations
    ORDER BY (sources + destinations) DESC
    """
    
    results = db.query(query)
    alerts = []
    
    for row in results:
        hub_id = row['hub_id']
        sources = row['sources']
        destinations = row['destinations']
        total_connections = sources + destinations
        
        risk = min(int(40 + total_connections * 5), 100)
        
        update_query = """
        MATCH (a:Account {id: $hub_id})
        SET a.gather_scatter_flag = true,
            a.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END
        """
        db.query(update_query, hub_id=hub_id, risk=risk)
        
        alerts.append({
            "type": "GATHER_SCATTER",
            "hub_id": hub_id,
            "bank": row['bank'],
            "sources": sources,
            "destinations": destinations,
            "risk_score": risk,
            "description": f"Hub amassed funds from {sources} and dispersed to {destinations} accounts"
        })
        
    print(f"Found {len(alerts)} gather-scatter hub patterns.")
    return alerts


def detect_scatter_gather():
    print("Running Scatter-Gather detection (Multipath routing)...")
    query = """
    MATCH path = (source:Account)-[:TRANSACTION]->(intermediary:Account)-[:TRANSACTION]->(dest:Account)
    WHERE source.id <> dest.id
    WITH source, dest, count(DISTINCT intermediary) AS intermediary_count
    WHERE intermediary_count >= 3
    RETURN source.id AS source_id, dest.id AS dest_id, intermediary_count
    ORDER BY intermediary_count DESC
    """
    
    results = db.query(query)
    alerts = []
    
    for row in results:
        source_id = row['source_id']
        dest_id = row['dest_id']
        intermediary_count = row['intermediary_count']
        
        risk = min(int(50 + intermediary_count * 8), 100)
        
        update_query = """
        MATCH (s:Account {id: $source_id}), (d:Account {id: $dest_id})
        SET s.scatter_gather_flag = true,
            s.suspicious = true,
            s.risk_score = CASE WHEN s.risk_score > $risk THEN s.risk_score ELSE $risk END,
            d.scatter_gather_flag = true,
            d.suspicious = true,
            d.risk_score = CASE WHEN d.risk_score > $risk THEN d.risk_score ELSE $risk END
        """
        db.query(update_query, source_id=source_id, dest_id=dest_id, risk=risk)
        
        alerts.append({
            "type": "SCATTER_GATHER",
            "source_id": source_id,
            "dest_id": dest_id,
            "intermediary_count": intermediary_count,
            "risk_score": risk,
            "description": f"Funds routed via {intermediary_count} parallel intermediaries"
        })
        
    print(f"Found {len(alerts)} scatter-gather routing patterns.")
    return alerts
