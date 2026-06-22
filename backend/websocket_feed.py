import asyncio
import json
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect

# The pre-scripted 5-hop round-trip attack sequence
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

async def websocket_live_feed(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket Client Connected to /ws/live")
    try:
        # Wait for a start message from the client
        data = await websocket.receive_text()
        print(f"WS Received: {data}")
        
        # Start emitting the attack sequence every 6 seconds
        for step in ATTACK_SEQUENCE:
            # Add dynamic timestamp
            step["timestamp"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            
            # Send the step
            await websocket.send_text(json.dumps(step))
            
            # Wait 6 seconds before sending the next one
            await asyncio.sleep(6)
            
        # Send a completion event
        await websocket.send_text(json.dumps({"type": "sequence_complete"}))
        
        # Keep connection open until client disconnects
        while True:
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        print("WebSocket Client Disconnected")
    except Exception as e:
        print(f"WebSocket Error: {str(e)}")
