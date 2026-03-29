import os
import sys
import argparse

# Change working dir to backend directory to ensure relative imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import db
from core.config import settings

def main():
    parser = argparse.ArgumentParser(description="Seed data to a remote Neo4j instance.")
    parser.add_argument("--uri", help="Neo4j URI (bolt or neo4j+s)")
    parser.add_argument("--user", help="Neo4j Username")
    parser.add_argument("--password", help="Neo4j Password")
    args = parser.parse_args()

    # Override settings if args provided
    if args.uri: os.environ["NEO4J_URI"] = args.uri
    if args.user: os.environ["NEO4J_USER"] = args.user
    if args.password: os.environ["NEO4J_PASSWORD"] = args.password

    # Path to CSV
    csv_path = os.path.join(os.path.dirname(__file__), 'data', 'HI-Small_Trans.csv')
    
    print("=== CLOUD DATA RESTORATION ===")
    print(f"Target URI: {settings.NEO4J_URI}")
    
    from data.ibm_preprocessor import load_and_sample, extract_accounts
    from data.neo4j_loader import run_full_load
    from data.hybrid_loader import add_synthetic_ownership_layer
    
    print("\n1. Loading Core Transaction Data...")
    result = run_full_load(csv_path)
    print("Full load complete:", result)
    
    print("\n2. Generating Synthetic Ownership Layer...")
    df = load_and_sample(csv_path, sample_size=50000)
    accounts_df = extract_accounts(df)
    add_synthetic_ownership_layer(accounts_df)
    
    print("\n3. Running Detection Engines...")
    from routers.detection import run_all_detectors
    res = run_all_detectors()
    print("Detection complete. Alerts generated.")
    
    print("\nSUCCESS: Cloud Database is now seeded and ready.")

if __name__ == "__main__":
    main()
