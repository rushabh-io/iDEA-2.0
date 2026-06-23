import asyncio
import json
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect

# Demo / Neo4j mode only — not used when Analysis Mode session is active
ATTACK_SEQUENCE = [
    {
        "type": "transaction",
        "txn_id": "LIVE_001",
        "from_account": "ACC00010",
        "to_account": "ACC00023",
        "amount": 5000000,
        "bank_from": "Union Bank",
        "bank_to": "SBI",
        "timestamp": "",
        "channel": "RTGS",
        "is_suspicious": False,
        "detection_fired": None
    },
    {
        "type": "transaction",
        "txn_id": "LIVE_002",
        "from_account": "ACC00023",
        "to_account": "ACC00041",
        "amount": 4900000,
        "bank_from": "SBI",
        "bank_to": "PNB",
        "timestamp": "",
        "channel": "NEFT",
        "is_suspicious": False,
        "detection_fired": None
    },
    {
        "type": "transaction",
        "txn_id": "LIVE_003",
        "from_account": "ACC00041",
        "to_account": "ACC00067",
        "amount": 4800000,
        "bank_from": "PNB",
        "bank_to": "Bank of Baroda",
        "timestamp": "",
        "channel": "IMPS",
        "is_suspicious": False,
        "detection_fired": None
    },
    {
        "type": "transaction",
        "txn_id": "LIVE_004",
        "from_account": "ACC00067",
        "to_account": "ACC00089",
        "amount": 4700000,
        "bank_from": "Bank of Baroda",
        "bank_to": "HDFC",
        "timestamp": "",
        "channel": "RTGS",
        "is_suspicious": False,
        "detection_fired": None
    },
    {
        "type": "transaction",
        "txn_id": "LIVE_005",
        "from_account": "ACC00089",
        "to_account": "ACC00010",
        "amount": 4600000,
        "bank_from": "HDFC",
        "bank_to": "Union Bank",
        "timestamp": "",
        "channel": "IMPS",
        "is_suspicious": True,
        "detection_fired": "circular_flow"
    }
]


def _parse_start_message(raw: str) -> dict:
    try:
        payload = json.loads(raw)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass
    return {"action": "start", "mode": "demo"}


def _resolve_sequence(mode: str, pattern: str) -> list:
    if mode != "analysis":
        return ATTACK_SEQUENCE

    from analysis.session import get_session
    from analysis.simulation_builder import build_analysis_attack_sequence

    session = get_session()
    if not session.active:
        return []

    if not session.detection_results:
        return []

    return build_analysis_attack_sequence(session, pattern_view=pattern)


async def websocket_live_feed(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket Client Connected to /ws/live")
    try:
        raw = await websocket.receive_text()
        print(f"WS Received: {raw}")

        payload = _parse_start_message(raw)
        mode = payload.get("mode", "demo")
        pattern = payload.get("pattern", "all")
        sequence = _resolve_sequence(mode, pattern)

        if mode == "analysis" and not sequence:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": (
                    "No simulation path available for this pattern. "
                    "Upload CSV, run analysis, and ensure the pattern is detected."
                ),
                "pattern": pattern,
            }))
            await websocket.send_text(json.dumps({"type": "sequence_complete"}))
            return

        for step in sequence:
            event = dict(step)
            event["timestamp"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            await websocket.send_text(json.dumps(event))
            await asyncio.sleep(6)

        await websocket.send_text(json.dumps({"type": "sequence_complete"}))

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        print("WebSocket Client Disconnected")
    except Exception as e:
        print(f"WebSocket Error: {str(e)}")
