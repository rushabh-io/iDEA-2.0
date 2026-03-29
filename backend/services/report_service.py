import json
import groq
from core.database import db
from core.config import settings


_cache = {}
client = groq.Groq(api_key=settings.GROQ_API_KEY)


def generate_report(account_id: str):
    if account_id in _cache:
        print(f"Returning cached compliance report for {account_id}")
        return _cache[account_id]
        
    print(f"Generating new compliance report with Claude for {account_id}...")
    
    # 1. Get Node Data
    acc_query = """
    MATCH (a:Account {id: $account_id})
    RETURN a
    """
    node = db.query(acc_query, account_id=account_id)
    if not node:
        return {"error": "Account not found"}
    acc_data = node[0]['a']
    
    # 2. Get Transaction Summary
    stats_query = """
    MATCH (a:Account {id: $account_id})-[t:TRANSACTION]->(dest:Account)
    RETURN sum(t.amount) as sent_total, count(t) as sent_count
    """
    stats = db.query(stats_query, account_id=account_id)[0]
    
    # 3. Get Top Transactions
    tx_query = """
    MATCH (a:Account {id: $account_id})-[t:TRANSACTION]->(dest:Account)
    RETURN dest.id as target, t.amount as amount, t.date as date, t.flag as flag
    ORDER BY t.amount DESC LIMIT 5
    """
    top_tx = db.query(tx_query, account_id=account_id)
    
    # Build prompt context
    flags = []
    for k, v in acc_data.items():
        if k.endswith('_flag') and v is True:
            flags.append(k.replace('_flag', '').upper())
            
    context = f"""
    Entity: Account {account_id} ({acc_data.get('bank', 'Unknown Bank')})
    Risk Score (0-100): {acc_data.get('risk_score', 0)}
    Suspicious Flags: {', '.join(flags) if flags else 'None'}
    ML Prediction: {acc_data.get('ml_prediction', 'UNKNOWN')} ({acc_data.get('ml_risk_score', 0)}%)
    
    Total Sent: ${stats['sent_total'] or 0:,.2f} ({stats['sent_count'] or 0} transactions)
    
    Notable Transactions:
    """
    for tx in top_tx:
        context += f"- ${tx['amount']:,.2f} to {tx['target']} on {tx['date']} [{tx['flag']}]\n"
        
    prompt = f"""
    You are a senior financial crime investigator analyzing data from the IBM AML dataset (NeurIPS 2023).
    Review the following entity data and provide a concise, professional compliance report.
    
    {context}
    
    Respond STRICTLY in the following format. Keep it under 100 words in total. Maintain a highly professional, clinical tone.
    
    RISK LEVEL: [Critical / High / Medium / Low]
    KEY FLAGS: [Bullet points of main concerns]
    RECOMMENDED ACTION: [1-2 sentences]
    """
    
    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            max_tokens=300,
            temperature=0.2,
            messages=[
                {"role": "system", "content": "You are an expert AML investigator. Always reference the IBM AML Dataset framing when applicable."},
                {"role": "user", "content": prompt}
            ]
        )
        
        report_text = response.choices[0].message.content
        
        result = {
            "account_id": account_id,
            "report_text": report_text,
            "generated_at": "Just now",
            "cached": False
        }
        
        _cache[account_id] = result
        return result
        
    except Exception as e:
        print(f"Groq API Error: {e}")
        return {
            "account_id": account_id,
            "report_text": f"RISK LEVEL: UNKNOWN\n\nERROR:\nFailed to generate report from LLM: {str(e)}\n\nCheck Groq API key.",
            "generated_at": "Failed",
            "cached": False
        }
