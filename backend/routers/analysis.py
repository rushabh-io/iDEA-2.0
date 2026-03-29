from fastapi import APIRouter, UploadFile, File, HTTPException
from analysis.session import (
    get_session, start_session, stop_session, is_active,
    set_detection_results, set_ml_predictions
)
from analysis.in_memory_graph import (
    get_cytoscape_elements, get_stats
)
from analysis.csv_analyzer import (
    run_all_detectors, get_validation_metrics
)
from analysis.standardizer import (
    read_transactions_table, standardize_transactions, StandardizationError
)
from analysis.schemas import ColumnMapping
from analysis.ml_feature_extractor import extract_features_from_dataframe
from analysis.ml_predictor import predict_on_features, is_model_available
import json
import numpy as np

router = APIRouter()


def _sanitize(obj):
    """Convert numpy/pandas types to native Python for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if hasattr(obj, 'item'):
        return obj.item()
    return obj


@router.get("/analysis/status")
def get_status():
    session = get_session()
    if not session.active:
        return {
            'active': False,
            'mode': 'normal'
        }
    return _sanitize({
        'active': True,
        'mode': 'analysis',
        'filename': session.filename,
        'uploaded_at': str(session.uploaded_at),
        'total_rows': session.total_rows,
        'fraud_rows': session.fraud_rows,
        'has_labels': session.has_labels,
        'format_detected': session.format_detected,
        'detection_ran': bool(session.detection_results),
        'ml_available': is_model_available(),
        'ml_ran': session.ml_predictions is not None,
        'standardization': session.standardization_metadata
    })


@router.post("/analysis/upload")
async def upload_for_analysis(
    file: UploadFile = File(...),
    mapping: str = None
):
    # Accept CSV, JSON, TSV, XLSX
    allowed_extensions = ('.csv', '.json', '.tsv', '.xlsx', '.txt')
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(allowed_extensions)}"
        )

    content = await file.read()
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum 100MB"
        )

    # Parse column mapping if provided
    column_mapping = None
    if mapping:
        try:
            payload = json.loads(mapping)
            column_mapping = ColumnMapping(**payload)
        except Exception:
            pass

    try:
        # Step 1: Read raw file (auto-detects format)
        raw_df = read_transactions_table(file.filename, content)

        # Step 2: Standardize to canonical format
        std_df, metadata = standardize_transactions(raw_df, mapping=column_mapping)

    except StandardizationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Parse/standardization error: {str(e)}"
        )

    # Step 3: Start analysis session with standardized data
    start_session(
        filename=file.filename,
        std_df=std_df,
        format_detected=metadata.resolved_fields.get("Timestamp", "auto"),
        metadata=metadata.model_dump()
    )

    session = get_session()

    return _sanitize({
        'success': True,
        'session_started': True,
        'filename': file.filename,
        'total_rows': metadata.record_count,
        'accounts_found': session.stats.get('total_accounts', 0),
        'fraud_rows': session.fraud_rows,
        'has_labels': session.has_labels,
        'format_detected': 'auto-standardized',
        'ml_available': is_model_available(),
        'standardization': {
            'resolved_fields': metadata.resolved_fields,
            'applied_defaults': metadata.applied_defaults,
            'unmapped_columns': metadata.unmapped_input_columns,
            'input_columns': metadata.input_columns,
        },
        'preview': std_df.head(5).fillna('').to_dict('records'),
        'columns': list(std_df.columns),
        'message': f"Standardized {metadata.record_count} transactions from {file.filename}"
    })


@router.post("/analysis/preview")
async def preview_for_analysis(
    file: UploadFile = File(...)
):
    allowed_extensions = ('.csv', '.json', '.tsv', '.xlsx', '.txt')
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(allowed_extensions)}"
        )

    content = await file.read()
    try:
        raw_df = read_transactions_table(file.filename, content, nrows=1000)
        std_df, metadata = standardize_transactions(raw_df)

        return _sanitize({
            'filename': file.filename,
            'total_rows': metadata.record_count,
            'columns': metadata.input_columns,
            'standardized_columns': metadata.standardized_columns,
            'format_detected': 'auto-standardized',
            'resolved_fields': metadata.resolved_fields,
            'applied_defaults': metadata.applied_defaults,
            'unmapped_columns': metadata.unmapped_input_columns,
            'preview': std_df.head(5).fillna('').to_dict('records'),
        })
    except StandardizationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot parse/standardize: {str(e)}"
        )


@router.post("/analysis/run")
def run_analysis():
    session = get_session()
    if not session.active:
        raise HTTPException(
            status_code=400,
            detail="No active analysis session. Upload a file first."
        )
    try:
        # Step 1: Run rule-based detectors
        results = run_all_detectors(session)
        set_detection_results(results)

        response = {
            'success': True,
            'total_alerts': results['total_alerts'],
            'by_pattern': results['by_pattern'],
            'message': f"Analysis complete. {results['total_alerts']} suspicious patterns detected.",
        }

        # Step 2: Run ML predictions if model is available
        if is_model_available() and session.std_df is not None:
            try:
                features = extract_features_from_dataframe(session.std_df)
                ml_results = predict_on_features(features)

                if 'error' not in ml_results:
                    set_ml_predictions(ml_results)
                    response['ml_results'] = {
                        'ml_flagged': ml_results['ml_flagged'],
                        'total_scored': ml_results['total_scored'],
                        'metrics': ml_results.get('metrics'),
                    }
                    response['message'] += f" ML flagged {ml_results['ml_flagged']} accounts."
                else:
                    response['ml_error'] = ml_results['error']
            except Exception as e:
                response['ml_error'] = f"ML prediction failed: {str(e)}"

        return _sanitize(response)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get("/analysis/graph")
def get_analysis_graph():
    session = get_session()
    if not session.active:
        raise HTTPException(status_code=400, detail="No active session")
    return _sanitize(get_cytoscape_elements(session))


@router.get("/analysis/stats")
def get_analysis_stats():
    session = get_session()
    if not session.active:
        raise HTTPException(status_code=400, detail="No active session")
    return _sanitize(get_stats(session))


@router.get("/analysis/alerts")
def get_analysis_alerts():
    session = get_session()
    if not session.active:
        return []
    if not session.detection_results:
        return []
    all_alerts = session.detection_results.get('all_alerts', [])

    # Enrich with ML predictions
    if session.ml_predictions and 'predictions' in session.ml_predictions:
        ml_map = {p['account_id']: p for p in session.ml_predictions['predictions']}
        for alert in all_alerts:
            acc_id = alert.get('account_id', '')
            if acc_id in ml_map:
                alert['ml_risk_score'] = ml_map[acc_id]['ml_risk_score']
                alert['ml_prediction'] = ml_map[acc_id]['ml_prediction']

    sorted_alerts = sorted(
        all_alerts,
        key=lambda x: x.get('risk_score', 0),
        reverse=True
    )
    return _sanitize(sorted_alerts[:100])


@router.get("/analysis/validate")
def get_analysis_validation():
    session = get_session()
    if not session.active:
        raise HTTPException(status_code=400, detail="No active session")

    result = get_validation_metrics(session)

    # If ML produced validation metrics, include those too
    if session.ml_predictions and 'metrics' in session.ml_predictions:
        ml_metrics = session.ml_predictions['metrics']
        if isinstance(ml_metrics, dict) and 'precision' in ml_metrics:
            result['ml_validation'] = {
                'precision_pct': ml_metrics['precision'],
                'recall_pct': ml_metrics['recall'],
                'f1_score': ml_metrics['f1'],
                'accuracy_pct': ml_metrics['accuracy'],
                'confusion_matrix': ml_metrics.get('confusion_matrix', {}),
            }

    return _sanitize(result)


@router.delete("/analysis/stop")
def stop_analysis():
    stop_session()
    return _sanitize({
        'success': True,
        'mode': 'normal',
        'message': "Analysis session ended. Returned to normal view."
    })


@router.get("/analysis/detection-summary")
def get_detection_summary():
    session = get_session()
    if not session.active or not session.detection_results:
        return {}
    result = {
        'by_pattern': session.detection_results.get('by_pattern', {}),
        'total_alerts': session.detection_results.get('total_alerts', 0),
        'filename': session.filename
    }
    if session.ml_predictions:
        result['ml_flagged'] = session.ml_predictions.get('ml_flagged', 0)
        result['ml_total_scored'] = session.ml_predictions.get('total_scored', 0)
    return result


@router.get("/analysis/ownership/{id}")
def get_analysis_ownership(id: str):
    session = get_session()
    if not session.active:
        raise HTTPException(status_code=400, detail="No active session")
    return {
        "chains": [{
            "depth": 1,
            "links": [
                {"owner": {"id": "N/A", "name": "Direct Ownership", "type": "System", "pep": False}, "percentage": 100},
                {"target": {"id": id}}
            ]
        }],
        "message": "Ownership data limited in CSV Analysis Mode."
    }


@router.post("/analysis/reports/{id}")
def create_analysis_report(id: str):
    session = get_session()
    if not session.active:
        raise HTTPException(status_code=400, detail="No active session")

    df = session.df
    acc_txns = df[(df['from_acc'] == id) | (df['to_acc'] == id)]

    total_sent = acc_txns[acc_txns['from_acc'] == id]['amount'].sum()
    total_recv = acc_txns[acc_txns['to_acc'] == id]['amount'].sum()

    fraud_count = 0
    if 'is_fraud' in acc_txns.columns:
        fraud_count = int(acc_txns['is_fraud'].sum())

    # ML info
    ml_info = ""
    if session.ml_predictions and 'predictions' in session.ml_predictions:
        ml_map = {p['account_id']: p for p in session.ml_predictions['predictions']}
        if id in ml_map:
            pred = ml_map[id]
            ml_info = f"""
ML MODEL PREDICTION
------------------
Prediction: {pred['ml_prediction']}
Risk Score: {pred['ml_risk_score']}%
"""

    report_text = f"""
NEXARA INVESTIGATION REPORT (ANALYSIS MODE)
===========================================
Entity ID: {id}
Session File: {session.filename}
Generated At: {str(session.uploaded_at)}

SUMMARY
-------
Total Transactions: {len(acc_txns)}
Total Sent: ${total_sent:,.2f}
Total Received: ${total_recv:,.2f}
Flagged (CSV Labels): {fraud_count}
{ml_info}
TRANSACTION LOG (Preview)
-----------------------
{acc_txns.head(20)[['timestamp', 'from_acc', 'to_acc', 'amount']].to_string(index=False)}

ANALYSIS NOTE
-------------
This account was analyzed as part of an in-memory session.
All data is derived from '{session.filename}'.
Neo4j permanent database was NOT consulted.
    """
    return {"report": report_text}
