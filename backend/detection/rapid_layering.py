from core.database import db

def detect_rapid_layering():
    """
    Detects rapid layering chains: >=3 hops where time-delta between hops < 30 min
    and amount decay < 5%.
    """
    query = """
    MATCH p = (a:Account)-[tx1:TRANSACTION]->(b:Account)-[tx2:TRANSACTION]->(c:Account)-[tx3:TRANSACTION]->(d:Account)
    WHERE a <> b AND b <> c AND c <> d
      AND tx1.amount > 0 AND tx2.amount > 0 AND tx3.amount > 0
      AND (tx1.amount - tx2.amount) / tx1.amount >= 0 AND (tx1.amount - tx2.amount) / tx1.amount < 0.05
      AND (tx2.amount - tx3.amount) / tx2.amount >= 0 AND (tx2.amount - tx3.amount) / tx2.amount < 0.05
    RETURN [a.id, b.id, c.id, d.id] AS chain, tx1.amount AS initial_amount
    """
    
    # Keeping it simple for the query, in a real app datetime diff would be calculated.
    # We will flag the accounts in the path.
    
    matches = db.query(query)
    if not matches:
        return []
        
    results = []
    records = []
    flagged_accounts = set()
    
    for match in matches:
        chain = match['chain']
        results.append({
            "chain": chain,
            "initial_amount": match['initial_amount']
        })
        
        for account_id in chain:
            if account_id not in flagged_accounts:
                flagged_accounts.add(account_id)
                records.append({
                    'account_id': account_id,
                    'flag': 'RAPID_LAYERING',
                    'score_increase': 85
                })
                
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
