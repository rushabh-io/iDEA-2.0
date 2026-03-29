import networkx as nx
from core.database import db
from detection.risk_scorer import calculate_risk_score


def detect_circular_flows(max_cycle_length=7):
    print("Running Circular Flow detection...")
    
    # Pull all TRANSACTION edges
    query = """
    MATCH (source:Account)-[t:TRANSACTION]->(target:Account)
    RETURN source.id AS source, target.id AS target, 
           t.id AS tx_id, t.amount AS amount, t.is_laundering AS is_laundering
    """
    edges = db.query(query)
    
    # Build DiGraph
    G = nx.DiGraph()
    for edge in edges:
        G.add_edge(edge['source'], edge['target'], 
                   tx_id=edge['tx_id'], 
                   amount=edge['amount'],
                   is_laundering=edge['is_laundering'])
                   
    try:
        cycles = list(nx.simple_cycles(G))
    except Exception as e:
        print(f"Cycle detection failed: {e}")
        return []
        
    results = []
    
    for cycle in cycles:
        hop_count = len(cycle)
        if 3 <= hop_count <= max_cycle_length:
            amounts = []
            tx_ids = []
            ground_truth = False
            
            # Trace the edges in the cycle
            for i in range(hop_count):
                u = cycle[i]
                v = cycle[(i + 1) % hop_count]
                edge_data = G.get_edge_data(u, v)
                amounts.append(edge_data['amount'])
                tx_ids.append(edge_data['tx_id'])
                if edge_data['is_laundering'] == 1:
                    ground_truth = True
                    
            total_amount = sum(amounts)
            risk_score = calculate_risk_score(hop_count, total_amount, amounts)
            
            # Write back to Neo4j
            update_query = """
            UNWIND $tx_ids AS tx_id
            MATCH (a1:Account)-[t:TRANSACTION {id: tx_id}]->(a2:Account)
            SET t.suspicious = true,
                t.flag = 'CIRCULAR_FLOW',
                t.risk_score = CASE WHEN t.risk_score > $risk THEN t.risk_score ELSE $risk END,
                a1.suspicious = true,
                a1.risk_score = CASE WHEN a1.risk_score > $risk THEN a1.risk_score ELSE $risk END,
                a2.suspicious = true,
                a2.risk_score = CASE WHEN a2.risk_score > $risk THEN a2.risk_score ELSE $risk END
            """
            db.query(update_query, tx_ids=tx_ids, risk=risk_score)
            
            results.append({
                "type": "CIRCULAR_FLOW",
                "cycle": cycle,
                "hop_count": hop_count,
                "total_amount": total_amount,
                "risk_score": risk_score,
                "ground_truth_confirmed": ground_truth,
                "description": f"{hop_count}-hop circular flow moving ${total_amount:,.2f}"
            })
            
    print(f"Found {len(results)} circular flows.")
    return results
