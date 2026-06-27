from fastapi import APIRouter
from core.database import db
from services.report_service import generate_report
from services.sar_service import generate_sar
from fiu_report import generate_fiu_package

router = APIRouter()

@router.post("/{account_id}")
def create_report(account_id: str):
    # Query the account's total suspicious volume from Neo4j
    account = db.query(
        "MATCH (a:Account {id: $id}) RETURN a",
        id=account_id
    )
    if not account:
        return {"error": "Account not found"}
        
    acc_node = account[0]['a']
    
    q_stats = """
    MATCH (a:Account {id: $id})-[t:TRANSACTION]-()
    WHERE t.suspicious = true
    RETURN sum(t.amount) as total_amount, count(t) as transaction_count
    """
    stats = db.query(q_stats, id=account_id)[0]
    total_amount = stats['total_amount'] or 0
    transaction_count = stats['transaction_count'] or 0
    
    # Generate the compliance report via LLM
    report_data = generate_report(account_id)
    
    # In the report template, replace "Amount Involved: Under review" with actual data if present
    if "report_text" in report_data and "Amount Involved: Under review" in report_data["report_text"]:
        report_data["report_text"] = report_data["report_text"].replace(
            "Amount Involved: Under review", 
            f"Amount Involved: ₹{total_amount:,.2f} across {transaction_count} transactions"
        )
        
    return report_data

@router.post("/sar/{account_id}")
def create_sar(account_id: str):
    # Query the account's total suspicious volume from Neo4j
    q_stats = """
    MATCH (a:Account {id: $id})-[t:TRANSACTION]-()
    WHERE t.suspicious = true
    RETURN sum(t.amount) as total_amount, count(t) as transaction_count
    """
    stats = db.query(q_stats, id=account_id)
    if stats:
        total_amount = stats[0]['total_amount'] or 0
        transaction_count = stats[0]['transaction_count'] or 0
    else:
        total_amount = 0
        transaction_count = 0

    sar_data = generate_sar(account_id)
    
    # In the report template, replace "Amount Involved: Under review"
    if "sar_text" in sar_data and "Amount Involved: Under review" in sar_data["sar_text"]:
        sar_data["sar_text"] = sar_data["sar_text"].replace(
            "Amount Involved: Under review",
            f"Amount Involved: ₹{total_amount:,.2f} across {transaction_count} transactions"
        )
        
    return sar_data

@router.post("/fiu/{account_id}")
def create_fiu_report(account_id: str):
    return generate_fiu_package(account_id)
