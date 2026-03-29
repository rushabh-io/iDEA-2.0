from fastapi import APIRouter
from pydantic import BaseModel
from services.graph_service import get_graph_data, get_stats
from data.neo4j_loader import run_full_load
from core.database import db
from core.config import settings

router = APIRouter()

class SimulationResponse(BaseModel):
    from_account: str
    to_account: str
    amount: float
    message: str

@router.get("/graph")
def get_graph():
    return get_graph_data()

@router.get("/graph/stats")
def fetch_stats():
    return get_stats()

@router.post("/simulate")
def simulate_tx():
    # Pick 2 random accounts
    q_random = """
    MATCH (a:Account)
    WITH a ORDER BY rand() LIMIT 2
    RETURN collect(a) as nodes
    """
    res = db.query(q_random)
    
    if not res or len(res[0]['nodes']) < 2:
        return {"error": "Not enough accounts to simulate"}
        
    nodes = res[0]['nodes']
    source = nodes[0]['id']
    target = nodes[1]['id']
    
    import random
    from datetime import datetime
    amount = round(random.uniform(50000, 999999), 2)
    today = datetime.now().strftime("%Y-%m-%d")
    
    q_create = """
    MATCH (s:Account {id: $source}), (t:Account {id: $target})
    CREATE (s)-[tx:TRANSACTION {
        id: 'SIM_' + toString(toInteger(rand() * 1000000)),
        amount: $amount,
        currency: 'USD',
        date: $date,
        hour: 12,
        is_laundering: 0,
        suspicious: false,
        risk_score: 0,
        flag: ''
    }]->(t)
    RETURN tx
    """
    
    db.query(q_create, source=source, target=target, amount=amount, date=today)
    
    return SimulationResponse(
        from_account=source,
        to_account=target,
        amount=amount,
        message="Simulated transaction successfully injected into graph"
    )

@router.post("/seed")
def seed_database():
    import os
    if not os.path.exists(settings.IBM_CSV_PATH):
        return {"error": f"CSV not found at {settings.IBM_CSV_PATH}"}
        
    result = run_full_load(settings.IBM_CSV_PATH)
    from data.hybrid_loader import add_synthetic_ownership_layer
    from data.ibm_preprocessor import load_and_sample, extract_accounts
    
    df = load_and_sample(settings.IBM_CSV_PATH, 50000)
    accounts_df = extract_accounts(df)
    add_synthetic_ownership_layer(accounts_df)
    
    return {
        "message": "Database successfully re-seeded",
        "details": result
    }
