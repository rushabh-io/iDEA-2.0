from core.database import db


def map_pep_networks():
    print("Running PEP Network Mapping...")
    
    # Find all accounts connected to a Politically Exposed Person
    query = """
    MATCH (p:Person {pep: true})-[:OWNS*1..4]->(a:Account)
    WITH p, collect(DISTINCT a) AS companies, count(DISTINCT a) AS company_count
    RETURN p.id AS pep_id, p.name AS pep_name, p.nationality AS nationality,
           company_count, [c in companies | c.id] AS company_ids,
           [c in companies | c.country] AS jurisdictions
    ORDER BY company_count DESC
    """
    
    results = db.query(query)
    alerts = []
    
    for row in results:
        company_count = row['company_count']
        
        # Risk base 60 for PEP, +10 for each company they control up to 100
        risk = min(int(60 + company_count * 10), 100)
        
        company_ids = row['company_ids']
        
        update_query = """
        UNWIND $company_ids AS acc_id
        MATCH (a:Account {id: acc_id})
        SET a.pep_connected = true,
            a.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END
        """
        db.query(update_query, company_ids=company_ids, risk=risk)
        
        alerts.append({
            "type": "PEP_NETWORK",
            "pep_id": row['pep_id'],
            "pep_name": row['pep_name'],
            "nationality": row['nationality'],
            "company_count": company_count,
            "companies": company_ids,
            "jurisdictions": list(set(row['jurisdictions'])),
            "risk_score": risk,
            "description": f"PEP ({row['nationality']}) controlling {company_count} connected corporate entities"
        })
        
    print(f"Found {len(alerts)} PEP operating networks.")
    return alerts
