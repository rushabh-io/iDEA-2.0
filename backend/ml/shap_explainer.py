import os
import pickle
import pandas as pd
import shap
from ml.feature_extractor import extract_features
from ml.trainer import FEATURE_COLS, MODEL_PATH, SCALER_PATH

def explain_account(account_id: str):
    """
    Computes SHAP values for the given account and returns the top 3 contributing risk factors.
    """
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        return {"error": "Model not trained yet."}
        
    with open(MODEL_PATH, 'rb') as f:
        rf = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
        
    df = extract_features()
    account_df = df[df['account_id'] == account_id]
    
    if account_df.empty:
        return {"error": f"Account {account_id} not found."}
        
    X = account_df[FEATURE_COLS].fillna(0)
    X_scaled = scaler.transform(X)
    
    # SHAP explainer
    explainer = shap.TreeExplainer(rf)
    shap_values = explainer.shap_values(X_scaled)
    
    # SHAP returns a list of arrays for classification (one for each class). We want the fraud class (class 1)
    # Check shape depending on shap version, usually shap_values[1] contains it.
    if isinstance(shap_values, list) and len(shap_values) > 1:
        sv = shap_values[1][0]
    else:
        # Some versions might return 3D array (samples, features, classes) or just 2D for 1 class
        sv = shap_values[0] if shap_values.ndim == 2 else shap_values[0, :, 1]
    
    pairs = sorted(zip(FEATURE_COLS, sv), key=lambda x: abs(x[1]), reverse=True)
    
    top_factors = [
        {
            "feature": f,
            "shap_value": round(float(v), 3)
        }
        for f, v in pairs[:3]
    ]
    
    return {
        "account_id": account_id,
        "explanation": top_factors
    }
