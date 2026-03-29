from fastapi import APIRouter
from core.database import db

router = APIRouter()

@router.get("/{account_id}")
def get_ownership_chain(account_id: str):
    query = """
    MATCH path=()-[:OWNS*1..6]->(a:Account {id:$account_id})
    WITH path, length(path) as depth, nodes(path) as entities, relationships(path) as rels
    RETURN depth, 
           [n in entities | {id: n.id, name: n.name, type: labels(n)[0], pep: n.pep}] as chain_nodes,
           [r in rels | {pct: r.percentage, since: r.since}] as chain_rels
    ORDER BY depth DESC
    """
    results = db.query(query, account_id=account_id)
    
    if not results:
        return {"chain": []}
        
    # Format into a nested structure for frontend
    formatted_chains = []
    for r in results:
        chain = []
        for i in range(len(r['chain_nodes']) - 1):
            chain.append({
                "owner": r['chain_nodes'][i],
                "percentage": r['chain_rels'][i].get('pct', 0),
                "since": r['chain_rels'][i].get('since', 'Unknown')
            })
        chain.append({"target": r['chain_nodes'][-1]})
        
        formatted_chains.append({
            "depth": r['depth'],
            "links": chain
        })
        
    return {"chains": formatted_chains}


@router.get("/ubo/{account_id}")
def get_ultimate_beneficial_owner(account_id: str):
    query = """
    MATCH path=(p:Person)-[:OWNS*1..6]->(a:Account {id:$account_id})
    RETURN p.id as id, p.name as name, p.nationality as nationality, p.pep as pep, length(path) as depth
    ORDER BY depth DESC LIMIT 1
    """
    
    res = db.query(query, account_id=account_id)
    if not res:
        return {"ubo": None, "message": "No individual UBO identified."}
        
    return {"ubo": res[0]}
