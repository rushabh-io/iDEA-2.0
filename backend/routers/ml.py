from fastapi import APIRouter
from ml.trainer import train_model, predict_all_accounts, predict_account
from ml.shap_explainer import explain_account

router = APIRouter()

@router.post("/train")
def ml_train():
    return train_model()

@router.post("/predict")
def ml_predict_all():
    return predict_all_accounts()

@router.get("/predict/{account_id}")
def ml_predict_single(account_id: str):
    return predict_account(account_id)

@router.get("/explain/{account_id}")
def ml_explain_single(account_id: str):
    return explain_account(account_id)
