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

# ─── Phase 5: Paginated SKU list ─────────────────────────────────────────────
@app.get("/api/skus")
def list_skus(
    dataset_version: str,
    page: int = 1,
    page_size: int = 50,
    search: str = "",
    category: str = "",
    sort_by: str = "sku",
    sort_dir: str = "asc",
    db: Session = Depends(get_db)
):
    query = db.query(
        models.DemandRecord.sku,
        models.DemandRecord.category,
        models.DemandRecord.location,
        models.DemandRecord.channel,
    ).filter(
        models.DemandRecord.dataset_version == dataset_version
    ).distinct()

    if search:
        query = query.filter(models.DemandRecord.sku.ilike(f"%{search}%"))
    if category:
        query = query.filter(models.DemandRecord.category == category)

    total = query.count()

    if sort_dir == "desc":
        query = query.order_by(models.DemandRecord.sku.desc())
    else:
        query = query.order_by(models.DemandRecord.sku.asc())

    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [{"sku": r.sku, "category": r.category, "location": r.location, "channel": r.channel} for r in rows],
    }


# ─── Phase 5: Paginated demand records ───────────────────────────────────────
@app.get("/api/records")
def list_records(
    dataset_version: str,
    sku: str = "",
    category: str = "",
    page: int = 1,
    page_size: int = 100,
    sort_by: str = "date",
    sort_dir: str = "asc",
    db: Session = Depends(get_db)
):
    query = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version
    )
    if sku:
        query = query.filter(models.DemandRecord.sku == sku)
    if category:
        query = query.filter(models.DemandRecord.category == category)

    total = query.count()

    col = getattr(models.DemandRecord, sort_by, models.DemandRecord.date)
    query = query.order_by(col.desc() if sort_dir == "desc" else col.asc())

    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [
            {
                "id": r.id,
                "date": r.date.isoformat() if r.date else None,
                "sku": r.sku,
                "category": r.category,
                "location": r.location,
                "channel": r.channel,
                "target_demand": r.target_demand,
                "dataset_version": r.dataset_version,
            }
            for r in rows
        ],
    }


# ─── Phase 5: Dataset summary statistics ─────────────────────────────────────
@app.get("/api/datasets/{dataset_version}/summary")
def dataset_summary(dataset_version: str, db: Session = Depends(get_db)):
    from sqlalchemy import func

    base = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version
    )

    total_records = base.count()
    if total_records == 0:
        raise HTTPException(404, "Dataset not found")

    sku_count    = base.with_entities(models.DemandRecord.sku).distinct().count()
    cat_count    = base.with_entities(models.DemandRecord.category).distinct().count()
    loc_count    = base.with_entities(models.DemandRecord.location).distinct().count()
    chan_count    = base.with_entities(models.DemandRecord.channel).distinct().count()
    total_demand = base.with_entities(func.sum(models.DemandRecord.target_demand)).scalar() or 0
    min_date     = base.with_entities(func.min(models.DemandRecord.date)).scalar()
    max_date     = base.with_entities(func.max(models.DemandRecord.date)).scalar()

    categories = [r[0] for r in base.with_entities(models.DemandRecord.category).distinct().all()]

    return {
        "dataset_version": dataset_version,
        "total_records": total_records,
        "sku_count": sku_count,
        "category_count": cat_count,
        "location_count": loc_count,
        "channel_count": chan_count,
        "total_demand": round(total_demand, 2),
        "date_range": {
            "min": min_date.isoformat() if min_date else None,
            "max": max_date.isoformat() if max_date else None,
        },
        "categories": categories,
    }


# ─── Phase 5: Export demand records as CSV ───────────────────────────────────
from fastapi.responses import StreamingResponse
import csv

@app.get("/api/export/records")
def export_records(
    dataset_version: str,
    sku: str = "",
    category: str = "",
    db: Session = Depends(get_db)
):
    query = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version
    )
    if sku:
        query = query.filter(models.DemandRecord.sku == sku)
    if category:
        query = query.filter(models.DemandRecord.category == category)

    rows = query.order_by(models.DemandRecord.date.asc()).all()

    def generate():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "date", "sku", "category", "location", "channel", "target_demand", "dataset_version"])
        for r in rows:
            writer.writerow([r.id, r.date, r.sku, r.category, r.location, r.channel, r.target_demand, r.dataset_version])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    filename = f"planora_export_{dataset_version}{'_' + sku if sku else ''}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ═════════════════════════════════════════════════════════════════════════════
# Phase 7 — Audit Trail & Activity Logging
# ═════════════════════════════════════════════════════════════════════════════
from datetime import datetime

@app.post("/api/audit/log")
async def log_action(
    user_id: str,
    role: str,
    action_type: str,
    dataset: str = "",
    metadata: dict = {},
    db: Session = Depends(get_db)
):
    """Log user actions for governance and auditability"""
    log_entry = models.AuditLog(
        user_id=user_id,
        role=role,
        timestamp=datetime.utcnow(),
        actionType=action_type,
        dataset=dataset,
        metadata_json=metadata
    )
    db.add(log_entry)
    db.commit()
    return {"status": "logged", "id": log_entry.id}


@app.get("/api/audit/logs")
def get_audit_logs(
    user_id: str = "",
    action_type: str = "",
    dataset: str = "",
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Retrieve audit trail with filters"""
    query = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc())
    
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    if action_type:
        query = query.filter(models.AuditLog.actionType == action_type)
    if dataset:
        query = query.filter(models.AuditLog.dataset == dataset)
    
    logs = query.limit(limit).all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "role": log.role,
                "timestamp": log.timestamp.isoformat(),
                "action_type": log.actionType,
                "dataset": log.dataset,
                "metadata": log.metadata_json,
            }
            for log in logs
        ]
    }
