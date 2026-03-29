from core.database import db
from data.fatf_list import HIGH_RISK_COUNTRIES

def detect_fatf_risk():
    """
    Detects accounts linked to FATF high-risk jurisdictions.
    Returns list of suspicious accounts and their FATF jurisdiction.
    """
    results = []
    
    query = """
    MATCH (a:Account)
    WHERE a.country IN $jurisdictions
    RETURN a.id AS account_id, a.country AS country
    """
    
    matches = db.query(query, jurisdictions=HIGH_RISK_COUNTRIES)
    
    if not matches:
        return []
        
    records = []
    for match in matches:
        account_id = match['account_id']
        country = match['country']
        
        # Add risk and flag
        records.append({
            'account_id': account_id,
            'flag': 'FATF_RISK',
            'score_increase': 30
        })
        
        results.append({
            "account_id": account_id,
            "country": country,
            "risk_type": "FATF_JURISDICTION"
        })
        
    # Update Neo4j
    if records:
        update_query = """
        UNWIND $batch AS row
        MATCH (a:Account {id: row.account_id})
        SET a.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score < row.score_increase THEN row.score_increase ELSE a.risk_score END,
            a.flags = CASE 
                WHEN a.flags IS NULL THEN [row.flag] 
                WHEN NOT row.flag IN a.flags THEN a.flags + row.flag 
                ELSE a.flags 
            END
        """
        db.query(update_query, batch=records)
        
    return results
