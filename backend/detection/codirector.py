from core.database import db


def detect_codirector_networks():
    print("Running Co-director Network detection...")
    
    # Find individuals directing multiple accounts/companies
    query = """
    MATCH (p:Person)-[d:DIRECTOR_OF]->(a:Account)
    WITH p, count(DISTINCT a) AS company_count, collect(a.id) AS companies
    WHERE company_count >= 2
    RETURN p.id AS director_id, p.name AS director_name, p.pep AS is_pep, 
           company_count, companies
    ORDER BY company_count DESC
    """
    
    results = db.query(query)
    alerts = []
    
    for row in results:
        company_count = row['company_count']
        is_pep = row['is_pep']
        
        # Risk starts at 30, +15 per company, +30 if PEP
        base = 30 + (15 * company_count)
        if is_pep:
            base += 30
            
        risk = min(int(base), 100)
        
        update_query = """
        UNWIND $companies AS acc_id
        MATCH (a:Account {id: acc_id})
        SET a.codirector_flag = true,
            a.suspicious = true,
            a.risk_score = CASE WHEN a.risk_score > $risk THEN a.risk_score ELSE $risk END
        """
        db.query(update_query, companies=row['companies'], risk=risk)
        
        alerts.append({
            "type": "CODIRECTOR",
            "director_id": row['director_id'],
            "director_name": row['director_name'],
            "is_pep": is_pep,
            "company_count": company_count,
            "risk_score": risk,
            "description": f"Individual directing {company_count} distinct corporate accounts" + (" (PEP)" if is_pep else "")
        })
        
    print(f"Found {len(alerts)} overlapping director networks.")
    return alerts
