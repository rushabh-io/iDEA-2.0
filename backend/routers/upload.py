from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict
import json
import pandas as pd
import io
from starlette.concurrency import run_in_threadpool

from data.csv_parser import parse_csv_to_dataframe, load_csv_into_neo4j
from data.csv_validator import detect_format, auto_map_columns, validate_mapping

router = APIRouter()


class MappingRequest(BaseModel):
    column_mapping: Dict[str, str]
    filename: str


@router.post("/upload/preview")
async def preview_csv(file: UploadFile = File(...)):
    """
    Step 1: User uploads CSV.
    Returns detected format, auto-mapped columns, first 5 rows preview,
    column list, and validation result. Does NOT load into Neo4j yet.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    MAX_SIZE = 100 * 1024 * 1024  # 100MB
    content = await file.read()

    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 100MB")

    try:
        # Use threadpool for potentially slow pandas parsing
        df_raw = await run_in_threadpool(pd.read_csv, io.BytesIO(content), nrows=1000)
        columns = list(df_raw.columns)
        fmt = detect_format(columns)
        auto_mapping = auto_map_columns(columns)
        validation = validate_mapping(auto_mapping)
        preview_rows = df_raw.head(5).fillna('').to_dict('records')

        return {
            'filename': file.filename,
            'total_rows': len(df_raw),
            'columns': columns,
            'format_detected': fmt,
            'auto_mapping': auto_mapping,
            'validation': validation,
            'preview': preview_rows
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {str(e)}")


@router.post("/upload/import")
async def import_csv(file: UploadFile = File(...), mapping: Optional[str] = None):
    """
    Step 2: User confirms mapping and imports.
    Parses CSV, loads into Neo4j, runs fast detection algorithms.
    Returns load summary + initial detection results.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    column_mapping = None

    if mapping:
        try:
            column_mapping = json.loads(mapping)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid column mapping JSON")

    try:
        # Avoid blocking the main loop during parsing/loading
        parsed = await run_in_threadpool(parse_csv_to_dataframe, content, file.filename, column_mapping)
        load_result = await run_in_threadpool(load_csv_into_neo4j, parsed)

        # Import modules locally to avoid top-level hang and keep startup fast
        from detection.circular_flow import detect_circular_flows
        from detection.fan_patterns import detect_fan_out, detect_fan_in
        from detection.smurfing import detect_smurfing
        from detection.anomaly import detect_anomalies

        print("Running auto-detection on uploaded data...")
        try:
            circular = detect_circular_flows()
        except Exception:
            circular = []
        try:
            fan_out = detect_fan_out()
        except Exception:
            fan_out = []
        try:
            fan_in = detect_fan_in()
        except Exception:
            fan_in = []
        try:
            smurfing = detect_smurfing()
        except Exception:
            smurfing = []
        try:
            anomalies = detect_anomalies()
        except Exception:
            anomalies = []

        total_alerts = len(circular) + len(fan_out) + len(fan_in) + len(smurfing) + len(anomalies)

        return {
            'success': True,
            'load_summary': load_result,
            'auto_detection': {
                'circular_flows': len(circular),
                'fan_out': len(fan_out),
                'fan_in': len(fan_in),
                'smurfing': len(smurfing),
                'anomalies': len(anomalies),
                'total_alerts': total_alerts
            },
            'message': (
                f"Successfully loaded {load_result['accounts_loaded']} accounts and "
                f"{load_result['transactions_loaded']} transactions. "
                f"{total_alerts} suspicious patterns detected."
            )
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.post("/upload/validate-mapping")
async def validate_column_mapping(request: MappingRequest):
    """Validate a custom column mapping before import."""
    result = validate_mapping(request.column_mapping)
    return result


@router.get("/upload/template")
def download_template():
    """Returns a sample CSV template for users to download."""
    template = (
        "from_account,to_account,amount,date,currency,transaction_type,is_laundering\n"
        "ACC_001,ACC_002,15000,2024-01-15,USD,Wire,0\n"
        "ACC_002,ACC_003,14500,2024-01-16,USD,ACH,0\n"
        "ACC_003,ACC_001,14000,2024-01-17,USD,Wire,1\n"
        "ACC_004,ACC_005,9500,2024-01-18,USD,Cash,0\n"
        "ACC_004,ACC_005,9800,2024-01-19,USD,Cash,0\n"
    )
    return Response(
        content=template,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nexara_template.csv"}
    )
