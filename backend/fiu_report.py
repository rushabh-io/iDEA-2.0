import json
from datetime import datetime
from core.database import db
from core.config import settings
import anthropic

def generate_fiu_package(account_id: str):
    """
    Generates a structured Suspicious Transaction Report evidence package for 
    submission to India's Financial Intelligence Unit (FIU-IND) / goAML format.
    """
    # 1. Fetch Account + Patterns + Transactions
    q_acc = """
    MATCH (a:Account {id: $acc_id})
    OPTIONAL MATCH (a)-[tx:TRANSACTION]-()
    WHERE tx.suspicious = true
    RETURN a, collect(tx) as suspicious_txs
    """
    res = db.query(q_acc, acc_id=account_id)
    if not res:
        return {"error": "Account not found"}
        
    acc_node = res[0]['a']
    txs = res[0]['suspicious_txs']
    
    # 2. Extract Ownership Chain
    q_own = """
    MATCH path = (p:Person)-[:OWNS*1..6]->(a:Account {id: $acc_id})
    RETURN [n in nodes(path) | n.id] as chain
    """
    own_res = db.query(q_own, acc_id=account_id)
    ownership_chains = [r['chain'] for r in own_res] if own_res else []
    
    # 3. Generate Narrative with Claude
    narrative = "Narrative generation requires Anthropic API Key."
    if settings.ANTHROPIC_API_KEY:
        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            prompt = f"""
            Draft a formal Suspicious Transaction Report (STR) narrative for the FIU-IND regarding Account {account_id}.
            Risk Score: {acc_node.get('risk_score', 0)}
            ML Prediction: {acc_node.get('ml_prediction', 'UNKNOWN')}
            Flags: {', '.join(acc_node.get('flags', []))}
            Number of Suspicious Transactions: {len(txs)}
            
            Keep the tone objective, precise, and suitable for financial intelligence units. Focus on the red flags.
            """
            response = client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )
            narrative = response.content[0].text
        except Exception as e:
            narrative = f"Error generating narrative: {str(e)}"

    # 4. Generate goAML Draft XML
    date_str = datetime.now().strftime("%Y-%m-%d")
    xml_txs = ""
    for idx, tx in enumerate(txs[:10]):  # limit to 10 for XML example
        xml_txs += f'''
        <txn>
            <id>{tx.get('id', f'TXN_{idx}')}</id>
            <amount>{tx.get('amount', 0)}</amount>
            <date>{tx.get('date', '')}</date>
        </txn>'''

    goaml_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<str>
  <reporting_entity>Union Bank of India</reporting_entity>
  <report_date>{date_str}</report_date>
  <subject>
    <account_id>{account_id}</account_id>
    <risk_score>{acc_node.get('risk_score', 0)}</risk_score>
    <patterns>{', '.join(acc_node.get('flags', []))}</patterns>
  </subject>
  <transactions>{xml_txs}
  </transactions>
  <narrative>{narrative}</narrative>
</str>"""

    return {
        "summary": {
            "account_id": account_id,
            "risk_score": acc_node.get('risk_score', 0),
            "detection_timestamp": datetime.now().isoformat()
        },
        "pattern_evidence": acc_node.get('flags', []),
        "transaction_chain": [dict(tx) for tx in txs],
        "ownership_chain": ownership_chains,
        "narrative": narrative,
        "goaml_xml": goaml_xml
    }
