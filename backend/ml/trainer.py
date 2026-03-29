import os
import pickle
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, confusion_matrix
from core.database import db
from ml.feature_extractor import extract_features


FEATURE_COLS = [
    'out_degree', 'in_degree', 
    'total_sent', 'total_received',
    'avg_sent', 'avg_received', 
    'max_sent', 'min_sent', 'std_sent',
    'degree_ratio', 'amount_ratio', 
    'is_hub', 'near_threshold_flag', 'high_std',
    'near_threshold_count', 'dist_out', 'dist_in',
    'pattern_count', 'has_fan_out', 'has_fan_in', 'has_cycle',
    'has_gather_scatter', 'has_scatter_gather', 'has_stack',
    'has_bipartite', 'has_random', 'risk_score'
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")

# Ensure directory exists
os.makedirs(BASE_DIR, exist_ok=True)


def train_model():
    print("Training ML Model...")
    df = extract_features()
    
    if df.empty:
        return {"error": "No data available for training"}
        
    X = df[FEATURE_COLS].fillna(0)
    y = df['suspicious'].astype(int)
    
    if len(y.unique()) < 2:
        return {"error": "Not enough class diversity (need both clean and suspicious accounts)"}
        
    # Split 80/20 stratified
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    # Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Random Forest
    rf = RandomForestClassifier(
        n_estimators=100, 
        max_depth=10, 
        class_weight='balanced', 
        random_state=42, 
        n_jobs=-1
    )
    rf.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = rf.predict(X_test_scaled)
    
    metrics = {
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "accuracy": float(accuracy_score(y_test, y_pred))
    }
    
    cm = confusion_matrix(y_test, y_pred)
    if cm.shape == (2, 2):
        metrics["confusion_matrix"] = {
            "tn": int(cm[0][0]),
            "fp": int(cm[0][1]),
            "fn": int(cm[1][0]),
            "tp": int(cm[1][1])
        }
        
    # Feature importances
    importances = rf.feature_importances_
    feat_imp = {feat: float(imp) for feat, imp in zip(FEATURE_COLS, importances)}
    # Sort descending
    metrics["feature_importance"] = dict(sorted(feat_imp.items(), key=lambda item: item[1], reverse=True))
    
    # Save model and scaler
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(rf, f)
    with open(SCALER_PATH, 'wb') as f:
        pickle.dump(scaler, f)
        
    print(f"Model trained! F1: {metrics['f1']:.4f}")
    return metrics


def predict_account(account_id):
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        return {"error": "Model not trained yet."}
        
    with open(MODEL_PATH, 'rb') as f:
        rf = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
        
    # In a real system, we'd query just this account. 
    # For now, we extract all and filter (acceptable for the scale).
    df = extract_features()
    account_df = df[df['account_id'] == account_id]
    
    if account_df.empty:
        return {"error": "Account not found."}
        
    X = account_df[FEATURE_COLS].fillna(0)
    X_scaled = scaler.transform(X)
    
    pred_prob = rf.predict_proba(X_scaled)[0]
    is_laundering = int(rf.predict(X_scaled)[0])
    
    risk_score = min(int(pred_prob[1] * 100), 100)
    prediction = 'LAUNDERING' if is_laundering == 1 else 'CLEAN'
    confidence = float(pred_prob[1] if is_laundering == 1 else pred_prob[0])
    
    return {
        "account_id": account_id,
        "ml_risk_score": risk_score,
        "ml_prediction": prediction,
        "confidence": confidence
    }


def predict_all_accounts():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        return {"error": "Model not trained yet."}
        
    print("Running ML predictions on all accounts...")
        
    with open(MODEL_PATH, 'rb') as f:
        rf = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
        
    df = extract_features()
    if df.empty:
        return {"error": "No accounts to predict."}
        
    X = df[FEATURE_COLS].fillna(0)
    X_scaled = scaler.transform(X)
    
    probs = rf.predict_proba(X_scaled)[:, 1]
    preds = rf.predict(X_scaled)
    
    df['ml_risk_score'] = (probs * 100).astype(int)
    df['ml_prediction'] = ['LAUNDERING' if p == 1 else 'CLEAN' for p in preds]
    
    # Write back to Neo4j in batches
    update_query = """
    UNWIND $batch AS row
    MATCH (a:Account {id: row.account_id})
    SET a.ml_risk_score = row.ml_risk_score,
        a.ml_prediction = row.ml_prediction
    """
    
    records = []
    flagged_count = 0
    top_accounts = []
    
    # Create sorted dataframe to grab top 50
    sorted_df = df.sort_values(by='ml_risk_score', ascending=False)
    
    for _, row in df.iterrows():
        records.append({
            'account_id': str(row['account_id']),
            'ml_risk_score': int(row['ml_risk_score']),
            'ml_prediction': str(row['ml_prediction'])
        })
        
        if row['ml_prediction'] == 'LAUNDERING':
            flagged_count += 1
            
        if len(records) >= 500:
            db.query(update_query, batch=records)
            records = []
            
    if records:
        db.query(update_query, batch=records)
        
    # Get top 50
    for _, row in sorted_df.head(50).iterrows():
        top_accounts.append({
            "account_id": str(row['account_id']),
            "risk_score": int(row['risk_score']),
            "ml_risk_score": int(row['ml_risk_score']),
            "ml_prediction": str(row['ml_prediction'])
        })
        
    print(f"ML Prediction complete. Flagged {flagged_count} accounts.")
    return {
        "ml_flagged_accounts": flagged_count,
        "total_accounts_scored": len(df),
        "top_accounts": top_accounts
    }
