"""
In-Memory ML Predictor

Loads the pre-trained Random Forest model and scaler, runs predictions
on the feature DataFrame extracted from standardized uploads.
No Neo4j interaction — purely in-memory.
"""
import os
import pickle
import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, confusion_matrix


# Exact same feature columns as trainer.py
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

# Paths to the trained model artifacts
ML_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ml')
MODEL_PATH = os.path.join(ML_DIR, 'model.pkl')
SCALER_PATH = os.path.join(ML_DIR, 'scaler.pkl')


def is_model_available() -> bool:
    return os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH)


def predict_on_features(features_df: pd.DataFrame) -> dict:
    """
    Run the trained Random Forest on a feature DataFrame.

    Returns:
        dict with keys:
            - predictions: list of per-account dicts
            - ml_flagged: count of LAUNDERING predictions
            - total_scored: total accounts scored
            - metrics: precision/recall/f1 if ground_truth available
    """
    if not is_model_available():
        return {
            "error": "ML model not trained yet. Run detection on the IBM dataset first.",
            "predictions": [],
            "ml_flagged": 0,
            "total_scored": 0,
        }

    with open(MODEL_PATH, 'rb') as f:
        rf = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)

    # Ensure all feature columns exist; fill missing with 0
    for col in FEATURE_COLS:
        if col not in features_df.columns:
            features_df[col] = 0

    X = features_df[FEATURE_COLS].fillna(0)
    X_scaled = scaler.transform(X)

    probs = rf.predict_proba(X_scaled)
    preds = rf.predict(X_scaled)

    # Handle models that may only have seen one class
    if probs.shape[1] == 2:
        risk_scores = (probs[:, 1] * 100).astype(int)
    else:
        risk_scores = (probs[:, 0] * 100).astype(int)

    features_df = features_df.copy()
    features_df['ml_risk_score'] = risk_scores.clip(0, 100)
    features_df['ml_prediction'] = ['LAUNDERING' if p == 1 else 'CLEAN' for p in preds]

    # Build per-account results
    predictions = []
    for _, row in features_df.iterrows():
        predictions.append({
            'account_id': str(row['account_id']),
            'ml_risk_score': int(row['ml_risk_score']),
            'ml_prediction': str(row['ml_prediction']),
            'risk_score': int(row.get('risk_score', 0)),
        })

    flagged = sum(1 for p in preds if p == 1)

    result = {
        'predictions': predictions,
        'ml_flagged': flagged,
        'total_scored': len(features_df),
    }

    # If ground truth is available, compute validation metrics
    if 'ground_truth' in features_df.columns:
        y_true = features_df['ground_truth'].astype(int)
        y_pred = preds

        if len(y_true.unique()) >= 2:
            result['metrics'] = {
                'precision': round(float(precision_score(y_true, y_pred, zero_division=0)) * 100, 2),
                'recall': round(float(recall_score(y_true, y_pred, zero_division=0)) * 100, 2),
                'f1': round(float(f1_score(y_true, y_pred, zero_division=0)) * 100, 2),
                'accuracy': round(float(accuracy_score(y_true, y_pred)) * 100, 2),
            }
            cm = confusion_matrix(y_true, y_pred)
            if cm.shape == (2, 2):
                result['metrics']['confusion_matrix'] = {
                    'tp': int(cm[1][1]),
                    'fp': int(cm[0][1]),
                    'fn': int(cm[1][0]),
                    'tn': int(cm[0][0]),
                }
        else:
            result['metrics'] = {
                'note': 'Only one class found in ground truth. Cannot compute full metrics.',
            }

    return result
