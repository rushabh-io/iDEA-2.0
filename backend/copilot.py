from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from core.database import db
from core.config import settings
import anthropic

router = APIRouter()

class CopilotRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

def build_graph_context(context_data: dict) -> str:
    """Fetches relevant context from Neo4j based on provided context data"""
    if not context_data:
        return "No specific account context provided."
        
    context_str = []
    
    if 'account_id' in context_data:
        acc_id = context_data['account_id']
        query = """
        MATCH (a:Account {id: $acc_id})
        OPTIONAL MATCH (a)-[r:TRANSACTION]->(out_acc:Account)
        OPTIONAL MATCH (in_acc:Account)-[r2:TRANSACTION]->(a)
        RETURN a, count(DISTINCT out_acc) as out_degree, count(DISTINCT in_acc) as in_degree
        """
        res = db.query(query, acc_id=acc_id)
        if res:
            node = res[0]['a']
            context_str.append(f"Account {acc_id} Context:")
            context_str.append(f"- Risk Score: {node.get('risk_score', 0)}")
            context_str.append(f"- ML Prediction: {node.get('ml_prediction', 'UNKNOWN')}")
            context_str.append(f"- Suspicious Flags: {', '.join(node.get('flags', []))}")
            context_str.append(f"- Sending to {res[0]['out_degree']} unique accounts")
            context_str.append(f"- Receiving from {res[0]['in_degree']} unique accounts")
            
    if 'case_id' in context_data:
        case_id = context_data['case_id']
        context_str.append(f"Active Case ID: {case_id}")
            
    return "\n".join(context_str) if context_str else "Basic context provided."

@router.post("/copilot")
async def copilot(body: CopilotRequest):
    if not settings.ANTHROPIC_API_KEY:
        return {"reply": "Anthropic API key is not configured. Co-pilot is unavailable."}
        
    context_info = build_graph_context(body.context)
    
    system_prompt = f"""You are Nexara's AML investigation co-pilot.
You have access to the following graph context:
{context_info}

Answer the investigator's question accurately and concisely.
If asked to list accounts, return them as a structured list.
If asked to draft text, return formatted compliance language.
Never hallucinate account IDs or transaction amounts not in the context."""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": body.message}
            ]
        )
        return {"reply": response.content[0].text}
    except Exception as e:
        return {"reply": f"Co-pilot encountered an error: {str(e)}"}
