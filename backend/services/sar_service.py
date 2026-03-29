import groq
from core.database import db
from core.config import settings

_sar_cache = {}
client = groq.Groq(api_key=settings.GROQ_API_KEY)


def generate_sar(account_id: str):
    if account_id in _sar_cache:
        print(f"Returning cached SAR for {account_id}")
        return _sar_cache[account_id]
        
    print(f"Generating new SAR with Claude for {account_id}...")
    
    # Gather rich context
    q_account = "MATCH (a:Account {id: $account_id}) RETURN a"
    account = db.query(q_account, account_id=account_id)
    if not account:
        return {"error": "Account not found"}
    acc = account[0]['a']
    
    # UBOs and ownership
    q_ubo = """
    MATCH (p:Person)-[r:OWNS|DIRECTOR_OF*1..3]->(a:Account {id: $account_id})
    RETURN DISTINCT p.name as name, p.nationality as country, p.pep as is_pep
    """
    ubos = db.query(q_ubo, account_id=account_id)
    
    # Transacion volume
    q_tx = """
    MATCH (a:Account {id: $account_id})-[t:TRANSACTION]-(b:Account)
    RETURN sum(t.amount) as total_vol, min(t.date) as first_date, max(t.date) as last_date
    """
    tx_aggs = db.query(q_tx, account_id=account_id)[0]
    
    flags = [k.replace('_flag', '').upper() for k, v in acc.items() if k.endswith('_flag') and v is True]
    ubo_text = "\n".join([f"- {u['name']} ({u['country']}) {'[PEP]' if u['is_pep'] else ''}" for u in ubos])
    
    context = f"""
    SUBJECT: Account {account_id} at {acc.get('bank', 'Unknown')}
    RISK EVALUATION: Rule-based {acc.get('risk_score', 0)}/100 | ML Model: {acc.get('ml_risk_score', 0)}% ({acc.get('ml_prediction', 'UNKNOWN')})
    
    IDENTIFIED TYPOLOGIES: {', '.join(flags) if flags else 'Anomalous Activity'}
    
    VOLUMETRICS:
    Total Exposure: ${tx_aggs['total_vol'] or 0:,.2f}
    Date Range: {tx_aggs['first_date']} to {tx_aggs['last_date']}
    
    KNOWN ULTIMATE BENEFICIAL OWNERS / DIRECTORS:
    {ubo_text if ubo_text else "None identified due to opaque corporate structuring"}
    """
    
    prompt = f"""
    You are an automated regulatory reporting system formatting a Suspicious Activity Report (SAR) draft.
    Use the extracted network data to draft a highly professional, clinical, fact-based SAR narrative. 
    Do not invent transactions, but deduce the likely overarching typology from the 'IDENTIFIED TYPOLOGIES'.
    
    CONTEXT:
    {context}
    
    REQUIRED SECTIONS:
    1. Filing Institution (Nexara AML Intelligence)
    2. Subject Information
    3. Suspicious Activity Types
    4. Activity Description (Summarize the typologies mentioned)
    5. Amount Involved
    6. Date Range
    7. Recommended Action
    
    Keep the report under 350 words.
    """
    
    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            max_tokens=600,
            temperature=0.1,
            messages=[
                {"role": "system", "content": "You are generating an official regulatory document draft. Tone must be clinical, objective, and dense with facts."},
                {"role": "user", "content": prompt}
            ]
        )
        
        sar_text = response.choices[0].message.content
        
        result = {
            "account_id": account_id,
            "risk_score": acc.get('risk_score', 0),
            "sar_text": sar_text,
            "generated_at": "Just now"
        }
        
        _sar_cache[account_id] = result
        return result
        
    except Exception as e:
        print(f"Groq API Error (SAR): {e}")
        return {
            "account_id": account_id,
            "risk_score": acc.get('risk_score', 0),
            "sar_text": f"Error generating SAR document: \n\n{str(e)}",
            "generated_at": "Failed"
        }
