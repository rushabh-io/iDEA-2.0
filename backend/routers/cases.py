from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from core.database import db

router = APIRouter()

class CaseCreate(BaseModel):
    account_id: str
    title: str
    priority: str
    assigned_to: str
    notes: Optional[str] = ""

class CaseUpdate(BaseModel):
    status: str
    notes: Optional[str] = ""

@router.post("")
def create_case(case: CaseCreate):
    case_id = "CASE_" + uuid.uuid4().hex[:8].upper()
    now = datetime.now().isoformat()
    
    query = """
    MATCH (a:Account {id: $account_id})
    CREATE (c:Case {
        id: $case_id,
        title: $title,
        status: 'OPEN',
        priority: $priority,
        assigned_to: $assigned_to,
        notes: $notes,
        created_at: $now,
        updated_at: $now
    })
    CREATE (c)-[:INVESTIGATES]->(a)
    RETURN c
    """
    
    db.query(query, 
             account_id=case.account_id, case_id=case_id, title=case.title,
             priority=case.priority, assigned_to=case.assigned_to, 
             notes=case.notes, now=now)
             
    return {"case_id": case_id, "status": "OPEN"}


@router.get("")
def get_cases():
    query = """
    MATCH (c:Case)-[:INVESTIGATES]->(a:Account)
    RETURN c.id as id, c.title as title, c.status as status, c.priority as priority,
           c.assigned_to as assigned_to, c.notes as notes, c.created_at as created_at,
           c.updated_at as updated_at, a.id as account_id
    ORDER BY 
        CASE c.priority 
            WHEN 'High' THEN 1 
            WHEN 'Medium' THEN 2 
            WHEN 'Low' THEN 3 
            ELSE 4 END,
        c.created_at DESC
    """
    return db.query(query)


@router.patch("/{case_id}")
def update_case(case_id: str, case_update: CaseUpdate):
    now = datetime.now().isoformat()
    query = """
    MATCH (c:Case {id: $case_id})
    SET c.status = $status,
        c.notes = $notes,
        c.updated_at = $now
    RETURN c
    """
    res = db.query(query, case_id=case_id, status=case_update.status, 
                   notes=case_update.notes, now=now)
                   
    if not res:
        return {"error": "Case not found"}
        
    return {"status": "success", "case": dict(res[0]['c'])}


@router.get("/stats")
def get_case_stats():
    query = """
    MATCH (c:Case)
    RETURN c.status as status, count(c) as count
    """
    results = db.query(query)
    
    stats = {"OPEN": 0, "INVESTIGATING": 0, "CLOSED": 0, "ESCALATED": 0}
    for row in results:
        status = row['status']
        if status in stats:
            stats[status] = row['count']
            
    return stats
