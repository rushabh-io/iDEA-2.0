import os
from core.database import db
from data.ibm_preprocessor import load_and_sample, extract_accounts
from data.neo4j_loader import clear_database, create_indexes, load_accounts_batch, load_transactions_batch
from data.hybrid_loader import add_synthetic_ownership_layer
from routers.detection import run_all_detectors

def load_data():
    csv_path = r"d:\Project\iDEA-2.0\nexara_test_data.csv"
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    print("Loading test dataset from CSV...")
    df = load_and_sample(csv_path, sample_size=50000)
    
    if not df.empty:
        print("Clearing Neo4j database...")
        clear_database()
        create_indexes()
        
        print("Extracting accounts...")
        accounts_df = extract_accounts(df)
        
        print("Loading accounts...")
        load_accounts_batch(accounts_df)
        
        print("Loading transactions...")
        load_transactions_batch(df)
        
        print("Adding synthetic ownership layer for PEPs and corporate layering...")
        add_synthetic_ownership_layer(accounts_df)
        
        print("\n--- Running Pattern Detection Algorithms ---")
        run_all_detectors()
        
        print("\nSuccessfully loaded test data and calculated risk scores!")

if __name__ == "__main__":
    load_data()
