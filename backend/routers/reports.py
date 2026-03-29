from fastapi import APIRouter
from services.report_service import generate_report
from services.sar_service import generate_sar
from fiu_report import generate_fiu_package

router = APIRouter()

@router.post("/{account_id}")
def create_report(account_id: str):
    return generate_report(account_id)

@router.post("/sar/{account_id}")
def create_sar(account_id: str):
    return generate_sar(account_id)

@router.post("/fiu/{account_id}")
def create_fiu_report(account_id: str):
    return generate_fiu_package(account_id)
