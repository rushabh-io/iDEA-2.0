import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.database import db
from data.ibm_preprocessor import load_and_sample, extract_accounts
from data.neo4j_loader import run_full_load, clear_database, create_indexes, load_accounts_batch, load_transactions_batch
from data.hybrid_loader import add_synthetic_ownership_layer
from websocket_feed import websocket_live_feed
from fastapi import WebSocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    print("Starting up Nexara backend...")
    
    try:
        csv_path = settings.IBM_CSV_PATH
        if os.path.exists(csv_path):
            print("IBM CSV found. Running initial data load if DB is empty...")
            
            # Check if DB is already loaded
            stats = db.query("MATCH (n) RETURN COUNT(n) as count")
            if stats and stats[0]['count'] == 0:
                print("Database empty. Starting full import...")
                df = load_and_sample(csv_path, sample_size=50000)
                if not df.empty:
                    clear_database()
                    create_indexes()
                    
                    accounts_df = extract_accounts(df)
                    load_accounts_batch(accounts_df)
                    load_transactions_batch(df)
                    
                    # Run synthetic layer
                    add_synthetic_ownership_layer(accounts_df)
                    print("Initial load complete.")
            else:
                print(f"Database contains {stats[0]['count']} nodes. Skipping initial load.")
        else:
            print(f"IBM CSV not found at {csv_path}. Skipping initial load.")
    except Exception as e:
        print(f"WARNING: Database initialization failed: {e}")
        print("Backend will start in LIMITED MODE (Graph functions may not work).")
        
    yield
    
    # Shutdown sequence
    print("Shutting down...")
    db.close()


app = FastAPI(
    title="Nexara AML API",
    description="Adaptive Anti-Money Laundering Intelligence Platform API",
    version="1.0.0",
    lifespan=lifespan
)

@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await websocket_live_feed(websocket)

# Enhanced CORS for production
frontend_url = os.getenv("FRONTEND_URL", "*")
origins = [frontend_url] if frontend_url != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Nexara", "version": "1.0.0"}


# Mount routers here as they are developed
from routers import graph, detection, ownership, reports, cases, ml, upload, analysis
from copilot import router as copilot_router

app.include_router(graph.router, prefix="/api")
app.include_router(detection.router, prefix="/api")
app.include_router(ownership.router, prefix="/api/ownership")
app.include_router(reports.router, prefix="/api/reports")
app.include_router(cases.router, prefix="/api/cases")
app.include_router(ml.router, prefix="/api/ml")
app.include_router(upload.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
