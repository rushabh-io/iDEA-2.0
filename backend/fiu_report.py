import json
from datetime import datetime
import groq
from core.database import db
from core.config import settings

def generate_fiu_package(account_id: str):
    """
    Generates a structured Suspicious Transaction Report evidence package for 
    submission to India's Financial Intelligence Unit (FIU-IND) / goAML format.
    """
    # 1. Fetch Account + Patterns + Transactions
    q_stats = """
    MATCH (a:Account {id: $acc_id})
    OPTIONAL MATCH (a)-[tx_sent:TRANSACTION]->()
    WITH a, sum(tx_sent.amount) as total_sent
    OPTIONAL MATCH (a)<-[tx_recv:TRANSACTION]-()
    WITH a, total_sent, sum(tx_recv.amount) as total_received
    OPTIONAL MATCH (a)-[tx_susp:TRANSACTION]-(c:Account)
    WHERE tx_susp.suspicious = true
    RETURN a, total_sent, total_received, count(DISTINCT tx_susp) as transaction_count, collect(DISTINCT c.id) as flagged_counterparties, collect(DISTINCT tx_susp) as suspicious_txs
    """
    res = db.query(q_stats, acc_id=account_id)
    if not res:
        return {"error": "Account not found"}
        
    acc_node = res[0]['a']
    total_sent = res[0]['total_sent'] or 0
    total_received = res[0]['total_received'] or 0
    transaction_count = res[0]['transaction_count'] or 0
    flagged_counterparties = res[0]['flagged_counterparties'] or []
    txs = res[0]['suspicious_txs'] or []
    
    flags = [k.replace('_flag', '').upper() for k, v in acc_node.items() if k.endswith('_flag') and v is True]
    pattern_type = ', '.join(flags) if flags else 'Anomalous Activity'
    
    # 2. Extract Ownership Chain
    q_own = """
    MATCH path = (p:Person)-[:OWNS*1..6]->(a:Account {id: $acc_id})
    RETURN [n in nodes(path) | n.id] as chain
    """
    own_res = db.query(q_own, acc_id=account_id)
    ownership_chains = [r['chain'] for r in own_res] if own_res else []
    
    # 3. Build context string
    context = f"""
    Account ID: {account_id}
    Risk Score: {acc_node.get('risk_score', 0)}/100
    Total Suspicious Volume: ₹{total_sent:,}
    Transaction Count: {transaction_count}
    Detected Pattern: {pattern_type}
    Connected High-Risk Accounts: {', '.join(flagged_counterparties)}
    """
    
    system_prompt = """You are an expert compliance officer at Union Bank of India. Your task is to generate Suspicious Activity Reports (SARs) for filing with FIU-India under PMLA 2002 Section 12.

Generate a formal, complete report with these 6 sections:

1. REPORTING ENTITY: Union Bank of India — Fraud Risk Management Division

2. SUBJECT ACCOUNT DETAILS: Include account ID, detected typology, risk classification (Critical/High/Medium), and account holder profile if available.

3. TRANSACTION SUMMARY: Summarize the flagged transaction volume, timeframe (last 90 days), and transaction types (RTGS/NEFT/IMPS/NACH).

4. TYPOLOGY ANALYSIS: Explain which specific money laundering typology was detected (circular flow, structuring/smurfing, layering, rapid velocity, dormant account activation, etc.). Reference the specific transactions and amounts.

5. SUPPORTING EVIDENCE: List the graph-based evidence (node connections, transaction paths, co-director relationships, geographic anomalies) and ML risk factors that contributed to the alert.

6. RECOMMENDED ACTION: Conclude with "Recommend escalation to Compliance Officer for formal STR filing under PMLA 2002 Section 12. Suspicious Transaction Report submitted to FIU-India."

Format: Professional legal document, Minimum 800 words, PMLA 2002 Section 12 compliant. Use formal banking language. All rupee amounts must be shown as ₹X,XX,XXX format."""
    
    # 4. Generate Narrative with Groq
    narrative = "Narrative generation requires Groq API Key."
    if settings.GROQ_API_KEY:
        try:
            client = groq.Groq(api_key=settings.GROQ_API_KEY)
            response = client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                max_tokens=2048,
                temperature=0.2,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"{context}\n\nGenerate a full FIU-India Suspicious Activity Report."}
                ]
            )
            narrative = response.choices[0].message.content
        except Exception as e:
            narrative = f"Error generating narrative: {str(e)}"

    # 5. Generate goAML Draft XML
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
    <patterns>{pattern_type}</patterns>
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
        "pattern_evidence": flags,
        "transaction_chain": [dict(tx) for tx in txs],
        "ownership_chain": ownership_chains,
        "narrative": narrative,
        "goaml_xml": goaml_xml
    }
