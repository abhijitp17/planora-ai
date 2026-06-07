from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd
import io
import json

from database import engine, get_db, Base
import models
import schemas
from core.data_ingestion import process_upload_to_canonical

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Demand Planning MVP Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Demand Planning & Forecasting Platform"}

@app.post("/api/upload", response_model=schemas.FileUploadResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    column_mapping: str = Form(None), 
    db: Session = Depends(get_db)
):
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        elif file.filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(400, "Unsupported file type. Use .csv or .xlsx")
            
        mapping = json.loads(column_mapping) if column_mapping else None
        
        records, version = process_upload_to_canonical(df, mapping, planner_id="admin")
        
        # Insert to DB (bulk)
        db_records = [models.DemandRecord(**r) for r in records]
        db.bulk_save_objects(db_records)
        db.commit()
        
        return schemas.FileUploadResponse(
            filename=file.filename,
            status="SUCCESS",
            records_processed=len(records),
            dataset_version=version
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error processing file: {str(e)}")

@app.get("/api/datasets")
def list_datasets(db: Session = Depends(get_db)):
    versions = db.query(models.DemandRecord.dataset_version).distinct().all()
    return {"datasets": [v[0] for v in versions]}

@app.post("/api/forecast")
def generate_forecast(dataset_version: str, sku: str, horizon: int = 12, db: Session = Depends(get_db)):
    import numpy as np
    from core.forecasting import HoltWintersModel, ARIMAModel, XGBoostModel, calculate_metrics
    from core.ensembles import simple_average_ensemble
    
    # Extract data for SKU
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).order_by(models.DemandRecord.date).all()
    
    if not records:
        raise HTTPException(404, "Data not found for SKU")
        
    df = pd.DataFrame([{ "date": r.date, "demand": r.target_demand } for r in records])
    
    # Backtest with last 'horizon' periods
    train, test = df.iloc[:-horizon], df.iloc[-horizon:]
    
    if len(train) < 20: # Require minimum data
        raise HTTPException(400, "Not enough data points to train models")

    # Train Models
    hw = HoltWintersModel()
    hw.fit(train, "demand")
    hw_pred = hw.predict(horizon)
    
    arima = ARIMAModel()
    arima.fit(train, "demand")
    arima_pred = arima.predict(horizon)
    
    xgb_mdl = XGBoostModel()
    xgb_mdl.fit(train, "demand")
    xgb_pred = xgb_mdl.predict(horizon)

    # Ensemble
    ensemble_pred = simple_average_ensemble([hw_pred, arima_pred, xgb_pred])
    
    # Metrics
    metrics = {
        "hw": calculate_metrics(test["demand"].values, hw_pred),
        "arima": calculate_metrics(test["demand"].values, arima_pred),
        "xgboost": calculate_metrics(test["demand"].values, xgb_pred),
        "ensemble": calculate_metrics(test["demand"].values, ensemble_pred)
    }
    
    # Forecast future predictions based on FULL data
    hw.fit(df, "demand")
    hw_future = hw.predict(horizon)
    
    arima.fit(df, "demand")
    arima_future = arima.predict(horizon)
    
    xgb_mdl.fit(df, "demand")
    xgb_future = xgb_mdl.predict(horizon)
    
    ensemble_future = simple_average_ensemble([hw_future, arima_future, xgb_future])
    
    # Prepare Output
    output = {
        "backtest_metrics": metrics,
        "historical": df.to_dict('records'),
        "forecast": {
            "hw": hw_future.tolist(),
            "arima": arima_future.tolist(),
            "xgboost": xgb_future.tolist(),
            "ensemble": ensemble_future.tolist()
        }
    }
    return output
