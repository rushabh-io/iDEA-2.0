import os
import sys

# Change working dir to backend directory to ensure relative imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import db
from core.config import settings

def main():
    csv_path = os.path.join(os.path.dirname(__file__), 'data', 'HI-Small_Trans.csv')
    
    print("=== 1. DATA PIPELINE ===")
    from data.ibm_preprocessor import load_and_sample, extract_accounts
    from data.neo4j_loader import run_full_load
    from data.hybrid_loader import add_synthetic_ownership_layer
    
    # Run the full Neo4j load which handles parsing, labeling, mapping
    result = run_full_load(csv_path)
    print("Full load complete:", result)
    
    # Reload dataframe temporarily to generate synthetic ownership layer
    df = load_and_sample(csv_path, sample_size=50000)
    accounts_df = extract_accounts(df)
    add_synthetic_ownership_layer(accounts_df)
    print("Data Pipeline complete.")
    
    print("\n=== 2. DETECTION ALGORITHMS ===")
    from routers.detection import run_all_detectors
    res = run_all_detectors()
    print("Detect complete. Total alerts:", res.get('total_alerts'))
    
    print("\n=== 3. ML MODEL ===")
    from ml.trainer import train_model, predict_all_accounts
    train_res = train_model()
    print("Training complete. Results:", train_res)
    
    predict_res = predict_all_accounts()
    print("Predictions complete. Flagged:", predict_res.get('ml_flagged_accounts'))

if __name__ == "__main__":
    main()
