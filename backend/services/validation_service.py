from core.database import db


def get_accuracy_metrics():
    print("Calculating Validation Metrics against IBM dataset ground truth...")
    
    # TP: Flagged suspicious AND is_laundering = 1
    tp_query = "MATCH ()-[t:TRANSACTION]-() WHERE (STARTNODE(t).suspicious = true OR ENDNODE(t).suspicious = true) AND t.is_laundering = 1 RETURN count(t) AS count"
    tp_count = db.query(tp_query)[0]['count']
    
    # FP: Flagged suspicious AND is_laundering = 0
    fp_query = "MATCH ()-[t:TRANSACTION]-() WHERE (STARTNODE(t).suspicious = true OR ENDNODE(t).suspicious = true) AND t.is_laundering = 0 RETURN count(t) AS count"
    fp_count = db.query(fp_query)[0]['count']
    
    # FN: Not flagged AND is_laundering = 1
    fn_query = "MATCH ()-[t:TRANSACTION]-() WHERE NOT (STARTNODE(t).suspicious = true OR ENDNODE(t).suspicious = true) AND t.is_laundering = 1 RETURN count(t) AS count"
    fn_count = db.query(fn_query)[0]['count']
    
    # TN: Not flagged AND is_laundering = 0
    tn_query = "MATCH ()-[t:TRANSACTION]-() WHERE NOT (STARTNODE(t).suspicious = true OR ENDNODE(t).suspicious = true) AND t.is_laundering = 0 RETURN count(t) AS count"
    tn_count = db.query(tn_query)[0]['count']
    
    laundering_total = tp_count + fn_count
    total_txns = tp_count + fp_count + fn_count + tn_count
    
    precision = (tp_count / (tp_count + fp_count)) * 100 if (tp_count + fp_count) > 0 else 0
    recall = (tp_count / (tp_count + fn_count)) * 100 if (tp_count + fn_count) > 0 else 0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    accuracy = ((tp_count + tn_count) / total_txns) * 100 if total_txns > 0 else 0
    
    return {
        "precision_pct": round(precision, 2),
        "recall_pct": round(recall, 2),
        "f1_score": round(f1_score, 2),
        "accuracy_pct": round(accuracy, 2),
        "confusion_matrix": {
            "tp": tp_count,
            "fp": fp_count,
            "fn": fn_count,
            "tn": tn_count
        },
        "total_transactions": total_txns,
        "total_laundering_in_dataset": laundering_total
    }
