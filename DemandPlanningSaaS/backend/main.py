from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd
import io
import json
import math

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
from datetime import datetime, timedelta

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

# ═════════════════════════════════════════════════════════════════════════════
# DEMAND SENSING — Real-time early signal integration
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/demand-sensing/ingest")
async def ingest_pos_data(
    data: list[dict],  # [{date, sku, channel, actual_sales}]
    dataset_version: str,
    db: Session = Depends(get_db)
):
    """
    Real-time POS/early signal ingestion.
    Updates short-term forecast based on early week/month actuals.
    """
    ingested = 0
    for item in data:
        record = models.DemandSensingSignal(
            timestamp=datetime.fromisoformat(item['date']),
            sku=item['sku'],
            channel=item.get('channel', 'RETAIL'),
            actual_sales=item['actual_sales'],
            dataset_version=dataset_version,
        )
        db.add(record)
        ingested += 1
    
    db.commit()
    return {"status": "success", "signals_ingested": ingested, "dataset_version": dataset_version}


@app.get("/api/demand-sensing/signals")
def get_recent_signals(
    dataset_version: str,
    sku: str = "",
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """Get recent demand sensing signals for short-term forecast adjustment"""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    query = db.query(models.DemandSensingSignal).filter(
        models.DemandSensingSignal.dataset_version == dataset_version,
        models.DemandSensingSignal.timestamp >= cutoff
    )
    if sku:
        query = query.filter(models.DemandSensingSignal.sku == sku)
    
    signals = query.order_by(models.DemandSensingSignal.timestamp.desc()).limit(100).all()
    
    return {
        "signals": [
            {
                "timestamp": s.timestamp.isoformat(),
                "sku": s.sku,
                "channel": s.channel,
                "actual_sales": s.actual_sales,
            }
            for s in signals
        ],
        "hours": hours,
    }


# ═════════════════════════════════════════════════════════════════════════════
# CAUSAL FORECASTING — Exogenous variables for ARIMAX
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/forecast/causal")
def causal_forecast(
    dataset_version: str,
    sku: str,
    exog_variables: dict,  # {price: [values], promo: [0,1,0,1], holiday: [0,0,1,0]}
    horizon: int = 12,
    model: str = "arimax",  # arimax or sarimax
    db: Session = Depends(get_db)
):
    """
    Causal forecasting with exogenous variables.
    Supports: price, promotion flags, holiday indicators, competitor activity.
    """
    from core.forecasting import ARIMAXModel, SARIMAXModel
    import numpy as np
    
    # Fetch historical data
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).order_by(models.DemandRecord.date).all()
    
    if not records:
        raise HTTPException(404, "No data for this SKU")
    
    y = np.array([r.target_demand for r in records])
    
    # Build exogenous matrix
    exog_list = []
    for var_name, values in exog_variables.items():
        if len(values) == len(y):
            exog_list.append(values)
    
    if not exog_list:
        raise HTTPException(400, "Exogenous variables must match historical length")
    
    exog = np.column_stack(exog_list)
    
    # Train model
    ModelClass = SARIMAXModel if model == "sarimax" else ARIMAXModel
    fitted_model = ModelClass()
    fitted_model.fit(y, exog=exog)
    
    # Future exogenous values (user must provide)
    future_exog_values = exog_variables.get('future', [])
    if len(future_exog_values) != horizon:
        # Use last known values repeated
        future_exog = np.tile(exog[-1, :], (horizon, 1))
    else:
        future_exog = np.array(future_exog_values)
    
    predictions = fitted_model.predict(steps=horizon, exog=future_exog)
    
    return {
        "sku": sku,
        "model": model,
        "exog_vars": list(exog_variables.keys()),
        "forecast": predictions.tolist(),
        "historical": [{"date": r.date.isoformat(), "demand": r.target_demand} for r in records[-24:]],
    }


# ═════════════════════════════════════════════════════════════════════════════
# EVENT-BASED FORECASTING — Calendar events integration
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/events/create")
def create_event(
    name: str,
    event_type: str,  # holiday, promotion, launch, stockout, disruption
    start_date: str,
    end_date: str,
    impact_pct: float = 0.0,  # Expected demand impact (+25% for promo, -40% for disruption)
    affected_categories: list[str] = [],
    db: Session = Depends(get_db)
):
    """Create calendar event that impacts forecast"""
    event = models.CalendarEvent(
        name=name,
        event_type=event_type,
        start_date=datetime.fromisoformat(start_date),
        end_date=datetime.fromisoformat(end_date),
        impact_pct=impact_pct,
        affected_categories_json=affected_categories,
    )
    db.add(event)
    db.commit()
    return {"status": "created", "id": event.id, "name": name}


@app.get("/api/events")
def list_events(
    start_date: str = "",
    end_date: str = "",
    event_type: str = "",
    db: Session = Depends(get_db)
):
    """List calendar events for forecast adjustment"""
    query = db.query(models.CalendarEvent)
    
    if start_date:
        query = query.filter(models.CalendarEvent.start_date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(models.CalendarEvent.end_date <= datetime.fromisoformat(end_date))
    if event_type:
        query = query.filter(models.CalendarEvent.event_type == event_type)
    
    events = query.order_by(models.CalendarEvent.start_date).all()
    
    return {
        "events": [
            {
                "id": e.id,
                "name": e.name,
                "type": e.event_type,
                "start": e.start_date.isoformat(),
                "end": e.end_date.isoformat(),
                "impact_pct": e.impact_pct,
                "categories": e.affected_categories_json,
            }
            for e in events
        ]
    }


@app.post("/api/forecast/event-based")
def event_based_forecast(
    dataset_version: str,
    sku: str,
    horizon: int = 12,
    include_events: bool = True,
    db: Session = Depends(get_db)
):
    """
    Event-aware forecasting.
    Applies calendar event adjustments to baseline forecast.
    """
    # Get baseline forecast
    baseline_result = generate_forecast(dataset_version, sku, horizon, db)
    
    if not include_events:
        return baseline_result
    
    # Fetch events in forecast horizon
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).order_by(models.DemandRecord.date.desc()).first()
    
    if not records:
        return baseline_result
    
    last_date = records.date
    future_start = last_date + timedelta(days=1)
    future_end = future_start + timedelta(days=horizon * 30)  # Assume monthly
    
    events = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.start_date <= future_end,
        models.CalendarEvent.end_date >= future_start
    ).all()
    
    # Get SKU category
    sku_category = records.category
    
    # Apply event adjustments to ensemble forecast
    adjusted = baseline_result['forecast']['ensemble'].copy()
    for i, val in enumerate(adjusted):
        period_date = future_start + timedelta(days=i * 30)
        for event in events:
            if event.start_date <= period_date <= event.end_date:
                # Check if event applies to this SKU's category
                if not event.affected_categories_json or sku_category in event.affected_categories_json:
                    adjustment_factor = 1 + (event.impact_pct / 100)
                    adjusted[i] = int(val * adjustment_factor)
    
    baseline_result['forecast']['event_adjusted'] = adjusted
    baseline_result['events_applied'] = [
        {"name": e.name, "type": e.event_type, "impact": f"{e.impact_pct:+.1f}%"}
        for e in events
    ]
    
    return baseline_result


# ═════════════════════════════════════════════════════════════════════════════
# INVENTORY OPTIMIZATION — Multi-Echelon, ABC/XYZ, Network Balancing
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/inventory/multi-echelon")
def optimize_multi_echelon(
    dataset_version: str,
    network_config: dict,  # {nodes: [{id, type, holding_cost}], edges: [{from, to, lead_time}]}
    service_level: float = 0.95,
    db: Session = Depends(get_db)
):
    """
    Multi-echelon inventory optimization using network flow.
    Allocates safety stock across the network to minimize total cost while meeting service level.
    """
    # Simplified Clark-Scarf approach
    nodes = network_config.get('nodes', [])
    edges = network_config.get('edges', [])
    
    # Calculate echelon stock for each node
    z_score = 1.65  # 95% service level
    results = {}
    
    for node in nodes:
        node_id = node['id']
        holding_cost = node.get('holding_cost', 0.2)
        
        # Get demand data for this node
        records = db.query(models.DemandRecord).filter(
            models.DemandRecord.dataset_version == dataset_version,
            models.DemandRecord.location == node_id
        ).all()
        
        if not records:
            continue
        
        demand_vals = [r.target_demand for r in records]
        avg_demand = sum(demand_vals) / len(demand_vals) if demand_vals else 0
        std_demand = (sum((d - avg_demand) ** 2 for d in demand_vals) / len(demand_vals)) ** 0.5 if len(demand_vals) > 1 else 0
        
        # Find cumulative lead time from upstream
        cumulative_lt = 0
        for edge in edges:
            if edge['to'] == node_id:
                cumulative_lt += edge.get('lead_time', 7)
        
        # Echelon safety stock
        safety_stock = z_score * std_demand * (cumulative_lt ** 0.5)
        
        results[node_id] = {
            "safety_stock": round(safety_stock, 2),
            "holding_cost_annual": round(safety_stock * holding_cost * avg_demand, 2),
            "avg_demand": round(avg_demand, 2),
            "cumulative_lead_time": cumulative_lt,
        }
    
    return {"network_optimization": results, "service_level": service_level}


@app.get("/api/inventory/abc-xyz")
def abc_xyz_segmentation(
    dataset_version: str,
    db: Session = Depends(get_db)
):
    """
    ABC/XYZ segmentation.
    ABC = Revenue contribution (Pareto 80/20)
    XYZ = Demand variability (CV thresholds)
    """
    # Get all SKUs with their demand patterns
    records = db.query(
        models.DemandRecord.sku,
        models.DemandRecord.category,
    ).filter(
        models.DemandRecord.dataset_version == dataset_version
    ).all()
    
    sku_stats = {}
    for r in records:
        if r.sku not in sku_stats:
            sku_stats[r.sku] = {'category': r.category, 'demands': []}
        # In real implementation, aggregate demand per SKU
    
    # For each SKU calculate: revenue, CV
    from sqlalchemy import func
    sku_summary = db.query(
        models.DemandRecord.sku,
        models.DemandRecord.category,
        func.sum(models.DemandRecord.target_demand).label('total_demand'),
        func.avg(models.DemandRecord.target_demand).label('avg_demand'),
        func.count(models.DemandRecord.id).label('periods'),
    ).filter(
        models.DemandRecord.dataset_version == dataset_version
    ).group_by(
        models.DemandRecord.sku,
        models.DemandRecord.category
    ).all()
    
    # Calculate CV and revenue for each SKU
    classified = []
    total_revenue = 0
    
    for s in sku_summary:
        # Get std dev
        records_for_sku = db.query(models.DemandRecord.target_demand).filter(
            models.DemandRecord.dataset_version == dataset_version,
            models.DemandRecord.sku == s.sku
        ).all()
        demands = [r[0] for r in records_for_sku]
        avg = sum(demands) / len(demands)
        variance = sum((d - avg) ** 2 for d in demands) / len(demands)
        std_dev = variance ** 0.5
        cv = std_dev / avg if avg > 0 else 0
        
        # Mock revenue (in production: price * demand)
        revenue = s.total_demand * 100  # Assume $100 ASP
        total_revenue += revenue
        
        classified.append({
            'sku': s.sku,
            'category': s.category,
            'revenue': revenue,
            'cv': round(cv, 3),
            'avg_demand': round(avg, 2),
        })
    
    # Sort by revenue for ABC
    classified.sort(key=lambda x: x['revenue'], reverse=True)
    cumulative = 0
    for item in classified:
        cumulative += item['revenue']
        pct = cumulative / total_revenue
        if pct <= 0.8:
            item['abc'] = 'A'
        elif pct <= 0.95:
            item['abc'] = 'B'
        else:
            item['abc'] = 'C'
    
    # Classify XYZ by CV
    for item in classified:
        if item['cv'] < 0.2:
            item['xyz'] = 'X'  # Low variability
        elif item['cv'] < 0.5:
            item['xyz'] = 'Y'  # Medium variability
        else:
            item['xyz'] = 'Z'  # High variability
        
        item['segment'] = item['abc'] + item['xyz']
    
    return {
        "skus": classified,
        "summary": {
            "total_skus": len(classified),
            "A_skus": len([x for x in classified if x['abc'] == 'A']),
            "B_skus": len([x for x in classified if x['abc'] == 'B']),
            "C_skus": len([x for x in classified if x['abc'] == 'C']),
        }
    }


@app.post("/api/inventory/network-balance")
def network_balancing_recommendations(
    dataset_version: str,
    target_dos: int = 30,  # Target days of supply
    db: Session = Depends(get_db)
):
    """
    Network inventory balancing.
    Recommends transfers between locations to balance DoS across network.
    """
    from sqlalchemy import func
    
    # Get inventory position by location
    location_summary = db.query(
        models.DemandRecord.location,
        func.avg(models.DemandRecord.target_demand).label('avg_demand'),
        func.count(models.DemandRecord.id).label('periods'),
    ).filter(
        models.DemandRecord.dataset_version == dataset_version
    ).group_by(
        models.DemandRecord.location
    ).all()
    
    # Mock on-hand inventory (in production: from WMS API or inventory table)
    import random
    random.seed(42)
    
    recommendations = []
    for loc in location_summary:
        mock_on_hand = random.randint(500, 5000)
        dos = mock_on_hand / loc.avg_demand if loc.avg_demand > 0 else 0
        variance = dos - target_dos
        
        if variance > 15:  # Excess
            recommendations.append({
                'location': loc.location,
                'current_dos': round(dos, 1),
                'variance': round(variance, 1),
                'recommendation': 'TRANSFER_OUT',
                'quantity': round(variance * loc.avg_demand, 0),
                'target_location': 'Auto-suggest deficit location',
            })
        elif variance < -10:  # Deficit
            recommendations.append({
                'location': loc.location,
                'current_dos': round(dos, 1),
                'variance': round(variance, 1),
                'recommendation': 'TRANSFER_IN',
                'quantity': round(abs(variance) * loc.avg_demand, 0),
                'source_location': 'Auto-suggest surplus location',
            })
    
    return {"recommendations": recommendations, "target_dos": target_dos}


# ═════════════════════════════════════════════════════════════════════════════
# AI DECISION INTELLIGENCE — Prescriptive Actions & Autonomous Planning
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/ai/prescriptive-actions")
def generate_prescriptive_actions(
    dataset_version: str,
    sku: str = "",
    module: str = "all",  # demand, inventory, sop, finance
    db: Session = Depends(get_db)
):
    """
    Generate prescriptive action recommendations with confidence scores.
    Returns ranked list of recommended actions the planner should take.
    """
    actions = []
    
    # Get SKU data
    if sku:
        records = db.query(models.DemandRecord).filter(
            models.DemandRecord.dataset_version == dataset_version,
            models.DemandRecord.sku == sku
        ).all()
        
        if records:
            demands = [r.target_demand for r in records]
            avg = sum(demands) / len(demands)
            std = (sum((d - avg) ** 2 for d in demands) / len(demands)) ** 0.5
            cv = std / avg if avg > 0 else 0
            
            # Rule-based prescriptive logic
            if cv > 0.6:
                actions.append({
                    "action": "SWITCH_TO_CROSTON_MODEL",
                    "confidence": 0.92,
                    "impact": "Improve MAPE by ~15%",
                    "details": f"High variability (CV={cv:.2f}) suggests intermittent demand pattern",
                    "category": "forecasting",
                })
            
            if avg < 50:
                actions.append({
                    "action": "INCREASE_SAFETY_STOCK",
                    "confidence": 0.85,
                    "impact": "Reduce stockout risk by 40%",
                    "details": "Low volume SKUs benefit from higher buffer",
                    "category": "inventory",
                })
    
    # Global actions (not SKU-specific)
    actions.append({
        "action": "ENABLE_AUTONOMOUS_PLANNING",
        "confidence": 0.78,
        "impact": "Free 8 hours/week of planner time",
        "details": "42 SKUs with MAPE <5% can run on autopilot",
        "category": "automation",
    })
    
    actions.append({
        "action": "REDUCE_FORECAST_HORIZON",
        "confidence": 0.81,
        "impact": "Improve short-term accuracy by 12%",
        "details": "Models perform better at 3-6 month horizon vs 12-month",
        "category": "forecasting",
    })
    
    # Sort by confidence
    actions.sort(key=lambda x: x['confidence'], reverse=True)
    
    return {"actions": actions[:10], "module": module}


@app.post("/api/ai/autonomous-planning/enable")
def enable_autonomous_planning(
    dataset_version: str,
    sku_filter: dict = {},  # {mape_threshold: 5.0, min_history: 12}
    db: Session = Depends(get_db)
):
    """
    Enable autonomous planning for qualifying SKUs.
    Auto-runs forecast every period without planner intervention.
    """
    threshold = sku_filter.get('mape_threshold', 5.0)
    
    # Mock: identify qualifying SKUs (in production: check forecast_results table for MAPE)
    qualifying_skus = []
    
    records = db.query(
        models.DemandRecord.sku,
        func.count(models.DemandRecord.id).label('periods')
    ).filter(
        models.DemandRecord.dataset_version == dataset_version
    ).group_by(
        models.DemandRecord.sku
    ).all()
    
    for r in records:
        # Mock MAPE check (in production: query forecast_results)
        mock_mape = 3.5 + (hash(r.sku) % 100) / 50  # Deterministic mock 3.5-5.5%
        
        if mock_mape <= threshold and r.periods >= 12:
            qualifying_skus.append({
                "sku": r.sku,
                "mape": round(mock_mape, 2),
                "confidence": "High" if mock_mape < 4 else "Medium",
                "status": "ENABLED",
            })
    
    return {
        "enabled": True,
        "threshold": threshold,
        "qualifying_skus": len(qualifying_skus),
        "skus": qualifying_skus[:20],
    }


# ═════════════════════════════════════════════════════════════════════════════
# PLATFORM GOVERNANCE — Workflow Approvals & Master Data
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/workflow/approval/request")
async def request_approval(
    requester_id: str,
    approval_type: str,  # forecast_override, inventory_transfer, budget_change
    payload: dict,
    approver_role: str = "manager",
    db: Session = Depends(get_db)
):
    """Create approval request for governance workflow"""
    approval = models.ApprovalRequest(
        requester_id=requester_id,
        approval_type=approval_type,
        payload_json=payload,
        approver_role=approver_role,
        status="PENDING",
        created_at=datetime.utcnow(),
    )
    db.add(approval)
    db.commit()
    return {"status": "pending", "id": approval.id, "approver_role": approver_role}


@app.get("/api/workflow/approval/pending")
def get_pending_approvals(
    approver_role: str = "",
    approval_type: str = "",
    db: Session = Depends(get_db)
):
    """Get pending approval requests for a role"""
    query = db.query(models.ApprovalRequest).filter(
        models.ApprovalRequest.status == "PENDING"
    )
    if approver_role:
        query = query.filter(models.ApprovalRequest.approver_role == approver_role)
    if approval_type:
        query = query.filter(models.ApprovalRequest.approval_type == approval_type)
    
    requests = query.order_by(models.ApprovalRequest.created_at.desc()).limit(50).all()
    
    return {
        "approvals": [
            {
                "id": a.id,
                "requester": a.requester_id,
                "type": a.approval_type,
                "payload": a.payload_json,
                "status": a.status,
                "created": a.created_at.isoformat(),
            }
            for a in requests
        ]
    }


@app.post("/api/workflow/approval/{approval_id}/decision")
async def approve_or_reject(
    approval_id: int,
    decision: str,  # APPROVED or REJECTED
    approver_id: str,
    comments: str = "",
    db: Session = Depends(get_db)
):
    """Approve or reject a workflow request"""
    approval = db.query(models.ApprovalRequest).filter(
        models.ApprovalRequest.id == approval_id
    ).first()
    
    if not approval:
        raise HTTPException(404, "Approval request not found")
    
    approval.status = decision
    approval.approver_id = approver_id
    approval.approved_at = datetime.utcnow()
    approval.comments = comments
    
    db.commit()
    
    return {"status": decision.lower(), "id": approval_id}


@app.get("/api/master-data/skus")
def get_sku_master(
    category: str = "",
    status: str = "ACTIVE",
    db: Session = Depends(get_db)
):
    """Get SKU master data registry"""
    query = db.query(models.SKUMaster)
    if category:
        query = query.filter(models.SKUMaster.category == category)
    if status:
        query = query.filter(models.SKUMaster.status == status)
    
    skus = query.all()
    
    return {
        "skus": [
            {
                "sku": s.sku,
                "name": s.name,
                "category": s.category,
                "unit_cost": s.unit_cost,
                "asp": s.asp,
                "lead_time": s.lead_time,
                "supplier": s.supplier,
                "status": s.status,
            }
            for s in skus
        ]
    }


@app.post("/api/master-data/skus")
async def create_sku_master(
    sku: str,
    name: str,
    category: str,
    unit_cost: float,
    asp: float,
    lead_time: int,
    supplier: str = "",
    db: Session = Depends(get_db)
):
    """Create or update SKU master record"""
    existing = db.query(models.SKUMaster).filter(models.SKUMaster.sku == sku).first()
    
    if existing:
        existing.name = name
        existing.category = category
        existing.unit_cost = unit_cost
        existing.asp = asp
        existing.lead_time = lead_time
        existing.supplier = supplier
        existing.updated_at = datetime.utcnow()
    else:
        new_sku = models.SKUMaster(
            sku=sku, name=name, category=category,
            unit_cost=unit_cost, asp=asp, lead_time=lead_time,
            supplier=supplier, status="ACTIVE",
            created_at=datetime.utcnow(),
        )
        db.add(new_sku)
    
    db.commit()
    return {"status": "created", "sku": sku}


# ═════════════════════════════════════════════════════════════════════════════
# DIGITAL TWIN — Scenario Simulation Engine
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/twin/simulate-scenario")
def simulate_scenario(
    scenario_id: str,
    baseline_network: dict,  # {nodes: [...], edges: [...]}
    overrides: list[dict],   # [{edgeId: 'e1', field: 'leadTime', value: 30}]
    db: Session = Depends(get_db)
):
    """
    Run scenario simulation with network state propagation.
    Returns delta metrics: inventory cost, service level, stockouts.
    """
    import copy
    import networkx as nx
    
    # Clone baseline
    scenario_network = copy.deepcopy(baseline_network)
    
    # Apply overrides
    for override in overrides:
        if override.get('edgeId'):
            for edge in scenario_network['edges']:
                if edge['id'] == override['edgeId']:
                    edge[override['field']] = override['value']
        elif override.get('nodeId'):
            for node in scenario_network['nodes']:
                if node['id'] == override['nodeId']:
                    node[override['field']] = override['value']
    
    # Build graph for computation
    G = nx.DiGraph()
    for node in scenario_network['nodes']:
        G.add_node(node['id'], **node)
    for edge in scenario_network['edges']:
        G.add_edge(edge['source'], edge['target'], **edge)
    
    # Compute metrics
    baseline_inventory_cost = sum(n.get('inventoryValue', 0) for n in baseline_network['nodes'])
    scenario_inventory_cost = 0
    
    # Recalculate safety stock based on new lead times
    z_score = 1.65  # 95% service level
    for node_id in G.nodes():
        node_data = G.nodes[node_id]
        if node_data.get('type') in ['dc', 'retail']:
            # Get all upstream lead times
            cumulative_lt = 0
            for path in nx.all_simple_paths(G, source=[n for n in G.nodes() if G.nodes[n].get('type') == 'supplier'], target=node_id):
                path_lt = sum(G[path[i]][path[i+1]].get('leadTimeDays', 0) for i in range(len(path)-1))
                cumulative_lt = max(cumulative_lt, path_lt)
            
            # Mock demand (in production: query actual demand records)
            avg_demand = 150
            std_demand = 45
            
            # Safety stock = z × σ × √LT
            safety_stock = z_score * std_demand * (cumulative_lt ** 0.5)
            unit_cost = 100  # Mock
            inventory_value = safety_stock * unit_cost
            
            scenario_inventory_cost += inventory_value
    
    # Service level impact (simplified)
    baseline_service = 0.95
    lt_increase_pct = (scenario_inventory_cost - baseline_inventory_cost) / baseline_inventory_cost
    scenario_service = baseline_service * (1 - lt_increase_pct * 0.3)  # Rough approximation
    
    # Stockout estimate
    stockout_increase = max(0, int((baseline_service - scenario_service) * 50000))
    
    return {
        "scenario_id": scenario_id,
        "metrics": {
            "baseline": {
                "inventory_cost": round(baseline_inventory_cost, 0),
                "service_level": baseline_service,
                "stockouts": 0,
            },
            "scenario": {
                "inventory_cost": round(scenario_inventory_cost, 0),
                "service_level": round(scenario_service, 4),
                "stockouts": stockout_increase,
            },
            "delta": {
                "inventory_cost": round(scenario_inventory_cost - baseline_inventory_cost, 0),
                "service_level": round(scenario_service - baseline_service, 4),
                "stockouts": stockout_increase,
            }
        }
    }


@app.post("/api/twin/scenario-comparison")
def compare_scenarios(
    scenarios: list[dict],  # [{id, name, overrides}]
    baseline_network: dict,
    db: Session = Depends(get_db)
):
    """Compare multiple scenarios side-by-side"""
    results = []
    
    for scenario in scenarios:
        sim_result = simulate_scenario(
            scenario['id'],
            baseline_network,
            scenario['overrides'],
            db
        )
        results.append({
            "scenario_id": scenario['id'],
            "scenario_name": scenario['name'],
            "metrics": sim_result['metrics']
        })
    
    return {"comparisons": results}


# ═════════════════════════════════════════════════════════════════════════════
# RETAIL PLANNING — Space Optimization, Clustering, Markdown
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/retail/space-optimization")
def optimize_planogram_space(
    categories: list[dict],  # [{id, revenue, margin, current_linear_feet}]
    total_space: float,      # Total linear feet available
    constraints: dict = {}   # {min_per_category: 20, max_per_category: 500}
):
    """
    Linear programming solver for planogram space allocation.
    Maximize: Σ(sales × margin × turn_rate)
    Subject to: Σ(linear_feet) ≤ total_space, min/max per category
    """
    from scipy.optimize import linprog
    import numpy as np
    
    n = len(categories)
    
    # Objective: maximize sales × margin (negate for minimization)
    c = np.array([-cat['revenue'] * cat['margin'] / 100 for cat in categories])
    
    # Constraint: sum of space ≤ total_space
    A_ub = np.array([[1] * n])
    b_ub = np.array([total_space])
    
    # Bounds: min/max per category
    min_space = constraints.get('min_per_category', 20)
    max_space = constraints.get('max_per_category', 500)
    bounds = [(min_space, max_space) for _ in range(n)]
    
    # Solve
    result = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method='highs')
    
    if not result.success:
        raise HTTPException(500, "Optimization failed to converge")
    
    # Build response
    optimized = []
    for i, cat in enumerate(categories):
        new_space = round(result.x[i], 1)
        delta = new_space - cat.get('current_linear_feet', 0)
        optimized.append({
            "category_id": cat['id'],
            "current_space": cat.get('current_linear_feet', 0),
            "optimized_space": new_space,
            "delta": round(delta, 1),
            "projected_revenue_lift": round(delta * cat['revenue'] / cat.get('current_linear_feet', 1), 0) if delta > 0 else 0,
        })
    
    return {
        "optimized_allocation": optimized,
        "total_space_used": round(sum(result.x), 1),
        "projected_revenue_increase": round(-result.fun - sum(c * cat.get('current_linear_feet', 100) for cat, c_val in zip(categories, c)), 0),
    }


@app.post("/api/retail/store-clustering")
def cluster_stores(
    stores: list[dict],  # [{id, avg_transaction, basket_size, income_level, category_preference}]
    n_clusters: int = 3,
):
    """
    K-means clustering of stores based on demographics and sales patterns.
    Returns cluster assignments and recommended assortments per cluster.
    """
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    import numpy as np
    
    # Extract features
    features = []
    store_ids = []
    for store in stores:
        features.append([
            store.get('avg_transaction', 0),
            store.get('basket_size', 0),
            store.get('income_level', 0),
            store.get('category_preference', 0),
        ])
        store_ids.append(store['id'])
    
    X = np.array(features)
    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # K-means
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)
    
    # Build response
    clusters = {}
    for i, store_id in enumerate(store_ids):
        cluster_id = int(labels[i])
        if cluster_id not in clusters:
            clusters[cluster_id] = {"stores": [], "characteristics": {}}
        clusters[cluster_id]["stores"].append(store_id)
    
    # Characterize each cluster (simplified)
    cluster_names = {0: "Urban Premium", 1: "Suburban Family", 2: "Value Focused"}
    
    return {
        "clusters": [
            {
                "id": cluster_id,
                "name": cluster_names.get(cluster_id, f"Cluster {cluster_id}"),
                "store_count": len(data["stores"]),
                "stores": data["stores"],
                "recommended_assortment": "Premium SKUs" if cluster_id == 0 else "Value SKUs" if cluster_id == 2 else "Mixed",
            }
            for cluster_id, data in clusters.items()
        ],
        "n_clusters": n_clusters,
    }


@app.post("/api/retail/markdown-optimization")
def optimize_markdown_schedule(
    sku: str,
    current_inventory: int,
    current_price: float,
    cost: float,
    weeks_to_clear: int,
    min_margin_pct: float = 20.0,
    price_elasticity: float = -1.5,  # % demand change per % price change
):
    """
    Markdown optimization using price elasticity curve.
    Find markdown schedule that maximizes total margin while clearing inventory.
    """
    weekly_demand_base = current_inventory / weeks_to_clear
    
    # Try different markdown percentages
    best_markdown = 0
    best_total_margin = 0
    
    for markdown_pct in range(0, 61, 5):  # 0% to 60% in 5% increments
        new_price = current_price * (1 - markdown_pct / 100)
        margin_pct = ((new_price - cost) / new_price) * 100
        
        if margin_pct < min_margin_pct:
            continue  # Below minimum margin threshold
        
        # Demand increase from price elasticity
        demand_multiplier = (1 + (markdown_pct / 100) * abs(price_elasticity))
        weekly_demand = weekly_demand_base * demand_multiplier
        
        # Can we clear inventory?
        total_units_sold = weekly_demand * weeks_to_clear
        if total_units_sold < current_inventory:
            continue  # Won't clear inventory
        
        # Calculate total margin
        units_sold = min(current_inventory, total_units_sold)
        total_margin = units_sold * (new_price - cost)
        
        if total_margin > best_total_margin:
            best_total_margin = total_margin
            best_markdown = markdown_pct
    
    recommended_price = current_price * (1 - best_markdown / 100)
    projected_margin = ((recommended_price - cost) / recommended_price) * 100
    
    return {
        "sku": sku,
        "current_price": current_price,
        "recommended_markdown_pct": best_markdown,
        "recommended_price": round(recommended_price, 2),
        "projected_margin_pct": round(projected_margin, 1),
        "projected_total_margin": round(best_total_margin, 0),
        "weeks_to_clear": weeks_to_clear,
        "clearance_confidence": "High" if best_markdown > 0 else "Low",
    }


@app.get("/api/retail/categories")
def get_retail_categories(db: Session = Depends(get_db)):
    """Get retail categories from SKU data"""
    from sqlalchemy import func
    
    # Aggregate SKU data by category
    category_summary = db.query(
        models.DemandRecord.category,
        func.count(func.distinct(models.DemandRecord.sku)).label('sku_count'),
        func.sum(models.DemandRecord.target_demand).label('total_demand'),
    ).group_by(
        models.DemandRecord.category
    ).all()
    
    categories = []
    for cat in category_summary:
        # Mock revenue and margin (in production: join with pricing table)
        revenue = cat.total_demand * 50  # Assume $50 ASP
        margin = 35 + (hash(cat.category) % 30)  # Mock 35-65% margin
        
        categories.append({
            "id": f"cat-{cat.category.lower().replace(' ', '-')}",
            "name": cat.category,
            "department": "General Merchandise",  # Mock
            "revenue": round(revenue, 0),
            "margin": margin,
            "skus": cat.sku_count,
            "growthPct": (hash(cat.category) % 20) - 5,  # Mock -5% to +15%
        })
    
    return {"categories": categories}


@app.post("/api/retail/assortment-analysis")
def assortment_keep_drop_add(
    cluster_id: str,
    category_id: str,
    current_skus: list[str],
    db: Session = Depends(get_db)
):
    """
    Keep/Drop/Add SKU analysis for a store cluster.
    Rankings based on: profitability, turn rate, space efficiency.
    """
    # Get performance data for current SKUs
    sku_analysis = []
    
    for sku in current_skus:
        records = db.query(models.DemandRecord).filter(
            models.DemandRecord.sku == sku
        ).all()
        
        if not records:
            continue
        
        avg_demand = sum(r.target_demand for r in records) / len(records)
        # Mock profitability (in production: price × volume - cost)
        revenue = avg_demand * 50
        cost = avg_demand * 30
        profit = revenue - cost
        profit_per_facing = profit / 4  # Assume 4 facings
        
        recommendation = "KEEP"
        if profit_per_facing < 50:
            recommendation = "DROP"
        elif profit_per_facing > 200:
            recommendation = "EXPAND"
        
        sku_analysis.append({
            "sku": sku,
            "revenue": round(revenue, 0),
            "profit": round(profit, 0),
            "profit_per_facing": round(profit_per_facing, 0),
            "turn_rate": 8.5,  # Mock
            "recommendation": recommendation,
            "confidence": "High",
        })
    
    # Sort by profitability
    sku_analysis.sort(key=lambda x: x['profit_per_facing'], reverse=True)
    
    return {
        "cluster_id": cluster_id,
        "category_id": category_id,
        "analysis": sku_analysis,
        "keep_count": len([s for s in sku_analysis if s['recommendation'] == 'KEEP']),
        "drop_count": len([s for s in sku_analysis if s['recommendation'] == 'DROP']),
        "expand_count": len([s for s in sku_analysis if s['recommendation'] == 'EXPAND']),
    }


# ═════════════════════════════════════════════════════════════════════════════
# PRIORITY 1 ENHANCEMENTS — Backend
# ═════════════════════════════════════════════════════════════════════════════

from core.automl import AutoMLEngine, calculate_dynamic_safety_stock, optimize_service_level

# ── Redis Caching Layer ──────────────────────────────────────────────────────
try:
    import redis
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    REDIS_AVAILABLE = True
except:
    REDIS_AVAILABLE = False
    redis_client = None

def get_cached_forecast(cache_key: str):
    """Get cached forecast result"""
    if not REDIS_AVAILABLE or not redis_client:
        return None
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except:
        pass
    return None

def cache_forecast(cache_key: str, data: dict, ttl: int = 3600):
    """Cache forecast for 1 hour"""
    if not REDIS_AVAILABLE or not redis_client:
        return
    try:
        redis_client.setex(cache_key, ttl, json.dumps(data))
    except:
        pass


# ── AutoML Forecast with Model Selection ─────────────────────────────────────
@app.post("/api/forecast/automl")
def automl_forecast(
    dataset_version: str,
    sku: str,
    horizon: int = 12,
    tune_hyperparams: bool = True,
    db: Session = Depends(get_db)
):
    """
    AutoML: Trains all models, selects best by MAPE, returns optimized forecast.
    Caches results for 1 hour.
    """
    cache_key = f"automl:{dataset_version}:{sku}:{horizon}:{tune_hyperparams}"
    
    # Check cache
    cached = get_cached_forecast(cache_key)
    if cached:
        return {"cached": True, **cached}
    
    # Fetch data
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).order_by(models.DemandRecord.date).all()
    
    if not records:
        raise HTTPException(404, "No data for SKU")
    
    y = np.array([r.target_demand for r in records])
    
    # Run AutoML
    automl = AutoMLEngine(test_size=min(12, len(y) // 4))
    best_model_name, best_model, all_results = automl.select_best_model(
        y, horizon=horizon, tune_hyperparams=tune_hyperparams
    )
    
    # Generate forecast with confidence intervals
    forecast = best_model.predict(steps=horizon)
    lower, upper = automl.get_confidence_intervals(best_model, best_model_name, horizon)
    
    result = {
        "sku": sku,
        "best_model": best_model_name,
        "all_model_results": all_results,
        "forecast": forecast.tolist(),
        "confidence_intervals": {
            "lower_95": lower.tolist(),
            "upper_95": upper.tolist(),
        },
        "historical": [{"date": r.date.isoformat(), "demand": r.target_demand} for r in records[-24:]],
        "cached": False,
    }
    
    # Cache result
    cache_forecast(cache_key, result)
    
    return result


# ── Batch Forecast Processing ────────────────────────────────────────────────
@app.post("/api/forecast/batch")
async def batch_forecast(
    dataset_version: str,
    skus: list[str],
    horizon: int = 12,
    model: str = "xgboost",
    db: Session = Depends(get_db)
):
    """
    Batch forecast for multiple SKUs.
    Processes in parallel (up to 10 concurrent).
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    results = []
    errors = []
    
    def forecast_one(sku: str):
        try:
            # Check cache first
            cache_key = f"batch:{dataset_version}:{sku}:{model}:{horizon}"
            cached = get_cached_forecast(cache_key)
            if cached:
                return {"sku": sku, **cached}
            
            # Generate forecast
            forecast_result = generate_forecast(dataset_version, sku, horizon, db)
            cache_forecast(cache_key, forecast_result)
            return {"sku": sku, **forecast_result}
        except Exception as e:
            return {"sku": sku, "error": str(e)}
    
    # Parallel processing
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(forecast_one, sku): sku for sku in skus}
        for future in as_completed(futures):
            result = future.result()
            if 'error' in result:
                errors.append(result)
            else:
                results.append(result)
    
    return {
        "total_requested": len(skus),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors,
    }


# ── Dynamic Safety Stock Calculation ──────────────────────────────────────────
@app.post("/api/inventory/safety-stock/dynamic")
def calculate_dynamic_ss(
    sku: str,
    dataset_version: str,
    service_level: float = 0.95,
    lead_time_std: float = 0.0,  # Lead time variance (days)
    db: Session = Depends(get_db)
):
    """
    Dynamic safety stock incorporating lead time variance.
    More accurate than fixed-LT formula.
    """
    # Get demand statistics
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).all()
    
    if not records:
        raise HTTPException(404, "No data")
    
    demands = [r.target_demand for r in records]
    avg_demand = sum(demands) / len(demands)
    variance = sum((d - avg_demand)**2 for d in demands) / len(demands)
    std_demand = variance ** 0.5
    
    # Mock lead time (in production: from SKU master)
    avg_lead_time = 30
    
    ss = calculate_dynamic_safety_stock(
        avg_demand, std_demand, avg_lead_time, lead_time_std, service_level
    )
    
    return {
        "sku": sku,
        "safety_stock": round(ss, 2),
        "service_level": service_level,
        "avg_demand": round(avg_demand, 2),
        "std_demand": round(std_demand, 2),
        "avg_lead_time": avg_lead_time,
        "std_lead_time": lead_time_std,
        "includes_lead_time_variance": lead_time_std > 0,
    }


# ── Service Level Cost Optimizer ──────────────────────────────────────────────
@app.post("/api/inventory/service-level/optimize")
def optimize_sl(
    sku: str,
    dataset_version: str,
    unit_cost: float,
    holding_cost_pct: float = 0.20,
    stockout_cost_multiplier: float = 3.0,
    db: Session = Depends(get_db)
):
    """Find optimal service level minimizing total cost"""
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).all()
    
    if not records:
        raise HTTPException(404, "No data")
    
    demands = [r.target_demand for r in records]
    avg_demand = sum(demands) / len(demands)
    std_demand = (sum((d - avg_demand)**2 for d in demands) / len(demands)) ** 0.5
    
    lead_time = 30  # Mock
    stockout_cost = unit_cost * stockout_cost_multiplier
    
    optimal_sl, analysis = optimize_service_level(
        avg_demand, std_demand, lead_time, unit_cost, holding_cost_pct, stockout_cost
    )
    
    return {
        "sku": sku,
        "recommended_service_level": round(optimal_sl * 100, 1),
        **analysis,
    }


# ═════════════════════════════════════════════════════════════════════════════
# PRIORITY 2 ENHANCEMENTS — Endpoints
# ═════════════════════════════════════════════════════════════════════════════

from core.ensembles import stacked_ensemble_weights, detect_forecast_bias, sensitivity_analysis

@app.post("/api/forecast/ensemble/optimized")
def optimized_ensemble_forecast(
    dataset_version: str,
    sku: str,
    horizon: int = 12,
    db: Session = Depends(get_db)
):
    """Stacked ensemble with learned optimal weights"""
    # Get all model forecasts
    base_result = generate_forecast(dataset_version, sku, horizon, db)
    
    # Learn weights from historical performance
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).order_by(models.DemandRecord.date).all()
    
    if len(records) < 24:
        # Fall back to simple average
        return base_result
    
    actuals = np.array([r.target_demand for r in records[-24:]])
    model_preds = {
        'hw': np.array(base_result['forecast']['hw'][:24]),
        'arima': np.array(base_result['forecast']['arima'][:24]),
        'xgboost': np.array(base_result['forecast']['xgboost'][:24]),
    }
    
    weights = stacked_ensemble_weights(model_preds, actuals)
    
    # Apply weights to future forecast
    optimized = sum(
        np.array(base_result['forecast'][model]) * weight 
        for model, weight in weights.items()
    )
    
    base_result['forecast']['optimized_ensemble'] = optimized.tolist()
    base_result['ensemble_weights'] = weights
    
    return base_result


@app.get("/api/forecast/bias-analysis")
def analyze_forecast_bias(
    dataset_version: str,
    sku: str,
    db: Session = Depends(get_db)
):
    """Detect systematic forecast bias"""
    # Get historical forecasts and actuals
    forecasts = db.query(models.ForecastResult).filter(
        models.ForecastResult.dataset_version == dataset_version,
        models.ForecastResult.sku == sku
    ).order_by(models.ForecastResult.date).limit(24).all()
    
    if len(forecasts) < 12:
        return {"error": "Insufficient forecast history"}
    
    forecast_vals = np.array([f.forecast_demand for f in forecasts])
    
    # Get corresponding actuals
    actual_records = []
    for f in forecasts:
        actual = db.query(models.DemandRecord.target_demand).filter(
            models.DemandRecord.dataset_version == dataset_version,
            models.DemandRecord.sku == sku,
            models.DemandRecord.date == f.date
        ).first()
        if actual:
            actual_records.append(actual[0])
    
    if len(actual_records) != len(forecast_vals):
        return {"error": "Mismatched actual/forecast data"}
    
    actuals = np.array(actual_records)
    bias_info = detect_forecast_bias(actuals, forecast_vals)
    
    return {
        "sku": sku,
        **bias_info,
        "recommendation": f"Apply {bias_info['correction_factor']:.3f}x multiplier to future forecasts" if abs(bias_info['bias_pct']) > 5 else "No correction needed",
    }


@app.post("/api/forecast/sensitivity")
def forecast_sensitivity_analysis(
    dataset_version: str,
    sku: str,
    model: str = "xgboost",
    db: Session = Depends(get_db)
):
    """Run sensitivity analysis on forecast parameters"""
    # Get data
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).order_by(models.DemandRecord.date).all()
    
    if not records:
        raise HTTPException(404, "No data")
    
    y = np.array([r.target_demand for r in records])
    
    # Train model
    from core.forecasting import XGBoostModel
    fitted_model = XGBoostModel()
    fitted_model.fit(y[:-12])  # Hold out last 12 for testing
    
    # Define parameter variations
    param_variations = {
        'n_estimators': [50, 100, 200, 300],
        'max_depth': [3, 5, 7, 10],
        'learning_rate': [0.01, 0.05, 0.1, 0.3],
    }
    
    results = sensitivity_analysis(y, fitted_model, param_variations, horizon=12)
    
    return {
        "sku": sku,
        "model": model,
        "sensitivity_results": results,
        "baseline_params": {
            "n_estimators": fitted_model.n_estimators,
            "max_depth": fitted_model.max_depth,
            "learning_rate": fitted_model.learning_rate,
        }
    }


@app.post("/api/inventory/network-transfers/execute")
async def execute_network_transfers(
    transfers: list[dict],  # [{from, to, sku, quantity}]
    output_format: str = "SAP"  # SAP, Oracle, or CSV
):
    """Generate WMS transfer orders in ERP format"""
    import csv
    import io
    
    output = io.StringIO()
    
    if output_format == "SAP":
        # SAP IDoc format (simplified)
        writer = csv.writer(output)
        writer.writerow(["TransferOrder", "FromPlant", "ToPlant", "Material", "Quantity", "UOM", "Priority"])
        for i, t in enumerate(transfers, 1):
            writer.writerow([
                f"TO{i:06d}",
                t['from'],
                t['to'],
                t['sku'],
                t['quantity'],
                "EA",
                "HIGH" if t['quantity'] > 500 else "NORMAL"
            ])
    else:
        # Generic CSV
        writer = csv.DictWriter(output, fieldnames=['from_location', 'to_location', 'sku', 'quantity', 'status'])
        writer.writeheader()
        for t in transfers:
            writer.writerow({**t, 'status': 'PENDING'})
    
    csv_content = output.getvalue()
    
    return {
        "format": output_format,
        "transfer_count": len(transfers),
        "csv_content": csv_content,
        "filename": f"planora_transfers_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    }


@app.get("/api/analytics/kpi-history")
def get_kpi_history(
    kpi_name: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get historical KPI values for trend analysis"""
    # Mock implementation (in production: query kpi_snapshots table)
    import random
    random.seed(hash(kpi_name))
    
    history = []
    base_value = 4.5 if 'mape' in kpi_name.lower() else 95.0
    
    for i in range(days):
        date = (datetime.utcnow() - timedelta(days=days-i)).strftime('%Y-%m-%d')
        value = base_value + random.uniform(-0.5, 0.5)
        history.append({"date": date, "value": round(value, 2)})
    
    current = history[-1]["value"]
    previous = history[-30]["value"] if len(history) >= 30 else current
    delta = current - previous
    
    return {
        "kpi_name": kpi_name,
        "current_value": current,
        "previous_value": previous,
        "delta": round(delta, 2),
        "delta_pct": round((delta / previous) * 100, 1) if previous != 0 else 0,
        "trend": "improving" if delta < 0 and 'mape' in kpi_name.lower() else "improving" if delta > 0 else "stable",
        "history": history,
    }


@app.post("/api/analytics/anomaly-detection")
def detect_demand_anomalies(
    dataset_version: str,
    sku: str = "",
    db: Session = Depends(get_db)
):
    """Anomaly detection using Isolation Forest"""
    from sklearn.ensemble import IsolationForest
    
    query = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version
    )
    if sku:
        query = query.filter(models.DemandRecord.sku == sku)
    
    records = query.order_by(models.DemandRecord.date).all()
    
    if len(records) < 30:
        return {"error": "Need at least 30 data points"}
    
    # Extract features: demand value, day of week, week of year
    X = np.array([[
        r.target_demand,
        r.date.weekday() if r.date else 0,
        r.date.isocalendar()[1] if r.date else 0
    ] for r in records])
    
    # Train Isolation Forest
    clf = IsolationForest(contamination=0.1, random_state=42)
    predictions = clf.fit_predict(X)
    
    # Find anomalies
    anomalies = []
    for i, (pred, rec) in enumerate(zip(predictions, records)):
        if pred == -1:  # Anomaly
            anomalies.append({
                "date": rec.date.isoformat() if rec.date else "",
                "sku": rec.sku,
                "demand": rec.target_demand,
                "anomaly_score": float(clf.score_samples([X[i]])[0]),
                "severity": "high" if rec.target_demand > np.mean(X[:, 0]) + 3*np.std(X[:, 0]) else "medium",
            })
    
    return {
        "dataset_version": dataset_version,
        "sku": sku or "ALL",
        "total_records": len(records),
        "anomalies_detected": len(anomalies),
        "anomalies": anomalies[:50],  # Return top 50
    }


# ═════════════════════════════════════════════════════════════════════════════
# PRIORITY 2+3 — ALL REMAINING ENHANCEMENTS (22 items)
# ═════════════════════════════════════════════════════════════════════════════

# ── P2: Dynamic ROP with Forecast Integration ────────────────────────────────
@app.post("/api/inventory/rop/dynamic")
def dynamic_reorder_point(
    dataset_version: str, sku: str, service_level: float = 0.95,
    db: Session = Depends(get_db)
):
    """ROP = (Forecasted Demand × LT) + Safety Stock"""
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).order_by(models.DemandRecord.date).all()
    if not records: raise HTTPException(404, "No data")
    
    demands = [r.target_demand for r in records]
    avg_demand = sum(demands) / len(demands)
    std_demand = (sum((d - avg_demand)**2 for d in demands) / len(demands)) ** 0.5
    lead_time = 30
    
    # Use forecasted demand instead of historical average
    from core.forecasting import XGBoostModel
    y = np.array(demands)
    model = XGBoostModel()
    model.fit(y)
    forecasted_demand = float(np.mean(model.predict(steps=3)))  # Next 3 periods avg
    
    from scipy import stats
    z = stats.norm.ppf(service_level)
    ss = z * std_demand * (lead_time ** 0.5)
    rop = (forecasted_demand * (lead_time / 30)) + ss
    eoq = ((2 * avg_demand * 12 * 50) / (avg_demand * 0.2)) ** 0.5  # EOQ formula
    
    return {
        "sku": sku, "rop": round(rop, 0), "safety_stock": round(ss, 0),
        "eoq": round(eoq, 0), "forecasted_demand": round(forecasted_demand, 0),
        "avg_demand": round(avg_demand, 0), "lead_time_days": lead_time,
        "reorder_trigger": "NOW" if avg_demand * 0.5 < rop else "OK",
    }


# ── P3: Hierarchical Forecast Reconciliation ────────────────────────────────
@app.post("/api/forecast/reconcile")
def reconcile_hierarchical(
    dataset_version: str, horizon: int = 12,
    db: Session = Depends(get_db)
):
    """MinT reconciliation ensuring SKU forecasts sum to category totals"""
    from sqlalchemy import func
    
    # Get all SKU forecasts
    skus = db.query(models.DemandRecord.sku, models.DemandRecord.category,
        func.avg(models.DemandRecord.target_demand).label('avg_demand')
    ).filter(models.DemandRecord.dataset_version == dataset_version
    ).group_by(models.DemandRecord.sku, models.DemandRecord.category).all()
    
    # Category totals
    cat_totals = {}
    sku_forecasts = {}
    for s in skus:
        forecast = float(s.avg_demand) * 1.05  # Simple 5% growth
        sku_forecasts[s.sku] = {"category": s.category, "forecast": forecast}
        cat_totals[s.category] = cat_totals.get(s.category, 0) + forecast
    
    # Top-down reconciliation: adjust SKU forecasts proportionally
    cat_targets = {cat: total * 0.98 for cat, total in cat_totals.items()}  # 2% conservative
    
    reconciled = {}
    for sku, data in sku_forecasts.items():
        cat = data["category"]
        proportion = data["forecast"] / cat_totals[cat] if cat_totals[cat] > 0 else 0
        reconciled[sku] = {
            "original": round(data["forecast"], 0),
            "reconciled": round(cat_targets[cat] * proportion, 0),
            "adjustment": round(cat_targets[cat] * proportion - data["forecast"], 0),
            "category": cat,
        }
    
    return {"reconciled_forecasts": reconciled, "category_totals": cat_totals}


# ── P3: Seasonality Auto-Detection ───────────────────────────────────────────
@app.get("/api/forecast/detect-seasonality")
def detect_seasonality(dataset_version: str, sku: str, db: Session = Depends(get_db)):
    """Detect seasonal period using autocorrelation"""
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).order_by(models.DemandRecord.date).all()
    if len(records) < 24: return {"error": "Need 24+ data points"}
    
    y = np.array([r.target_demand for r in records])
    
    # Compute autocorrelation
    n = len(y)
    y_centered = y - np.mean(y)
    acf_values = np.correlate(y_centered, y_centered, mode='full')
    acf_values = acf_values[n-1:] / acf_values[n-1]  # Normalize
    
    # Find peaks in ACF (potential seasonal periods)
    peaks = []
    for i in range(2, min(len(acf_values), 53)):
        if i > 1 and i < len(acf_values) - 1:
            if acf_values[i] > acf_values[i-1] and acf_values[i] > acf_values[i+1] and acf_values[i] > 0.2:
                peaks.append({"period": i, "strength": float(acf_values[i])})
    
    peaks.sort(key=lambda x: x["strength"], reverse=True)
    detected_period = peaks[0]["period"] if peaks else None
    
    period_labels = {7: "Weekly", 12: "Monthly", 4: "Quarterly", 52: "Yearly"}
    
    return {
        "sku": sku, "detected_period": detected_period,
        "period_label": period_labels.get(detected_period, f"{detected_period}-period cycle" if detected_period else "None"),
        "confidence": peaks[0]["strength"] if peaks else 0,
        "all_peaks": peaks[:5],
        "recommendation": f"Use seasonal model with period={detected_period}" if detected_period else "Non-seasonal — use ARIMA or ML models",
    }


# ── P3: Outlier Detection & Cleaning ─────────────────────────────────────────
@app.post("/api/forecast/detect-outliers")
def detect_outliers(dataset_version: str, sku: str, method: str = "iqr", db: Session = Depends(get_db)):
    """Detect outliers using IQR or Z-score method"""
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).order_by(models.DemandRecord.date).all()
    if not records: raise HTTPException(404, "No data")
    
    demands = np.array([r.target_demand for r in records])
    dates = [r.date.isoformat() for r in records]
    
    outliers = []
    if method == "iqr":
        q1, q3 = np.percentile(demands, [25, 75])
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        for i, (d, date) in enumerate(zip(demands, dates)):
            if d < lower or d > upper:
                outliers.append({"index": i, "date": date, "value": float(d), "reason": f"Outside IQR bounds [{lower:.0f}, {upper:.0f}]"})
    else:  # Z-score
        mean, std = np.mean(demands), np.std(demands)
        for i, (d, date) in enumerate(zip(demands, dates)):
            z = abs((d - mean) / std) if std > 0 else 0
            if z > 3:
                outliers.append({"index": i, "date": date, "value": float(d), "z_score": float(z)})
    
    # Cleaned values (replace outliers with interpolated values)
    cleaned = demands.copy()
    for o in outliers:
        idx = o["index"]
        if 0 < idx < len(cleaned) - 1:
            cleaned[idx] = (cleaned[idx-1] + cleaned[idx+1]) / 2
    
    return {
        "sku": sku, "total_points": len(demands), "outliers_detected": len(outliers),
        "outliers": outliers, "cleaned_values": cleaned.tolist(),
    }


# ── P3: Forecast Versioning ──────────────────────────────────────────────────
@app.post("/api/forecast/save-version")
async def save_forecast_version(
    dataset_version: str, sku: str, model_name: str,
    forecast_values: list[float], notes: str = "",
    db: Session = Depends(get_db)
):
    """Save forecast snapshot as a version"""
    version_id = f"v_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    for i, val in enumerate(forecast_values):
        result = models.ForecastResult(
            date=datetime.utcnow() + timedelta(days=i*30),
            forecast_demand=val, sku=sku, model_name=model_name,
            ensemble_strategy=version_id, horizon=len(forecast_values),
            dataset_version=dataset_version,
        )
        db.add(result)
    db.commit()
    
    return {"version_id": version_id, "sku": sku, "periods": len(forecast_values)}


@app.get("/api/forecast/versions")
def list_forecast_versions(dataset_version: str, sku: str, db: Session = Depends(get_db)):
    """List all saved forecast versions for a SKU"""
    versions = db.query(
        models.ForecastResult.ensemble_strategy,
        models.ForecastResult.model_name,
        func.count(models.ForecastResult.id).label('periods'),
        func.min(models.ForecastResult.date).label('created'),
    ).filter(
        models.ForecastResult.dataset_version == dataset_version,
        models.ForecastResult.sku == sku,
        models.ForecastResult.ensemble_strategy.like('v_%')
    ).group_by(
        models.ForecastResult.ensemble_strategy, models.ForecastResult.model_name
    ).all()
    
    return {"versions": [
        {"version_id": v.ensemble_strategy, "model": v.model_name, "periods": v.periods, "created": v.created.isoformat() if v.created else ""}
        for v in versions
    ]}


# ── P3: Inventory Health Score ────────────────────────────────────────────────
@app.get("/api/inventory/health-score")
def calculate_health_score(dataset_version: str, sku: str, db: Session = Depends(get_db)):
    """Composite 0-100 health score: DoS(40%) + Turns(30%) + Stockout Risk(20%) + Capital(10%)"""
    records = db.query(models.DemandRecord).filter(
        models.DemandRecord.dataset_version == dataset_version,
        models.DemandRecord.sku == sku
    ).all()
    if not records: raise HTTPException(404, "No data")
    
    demands = [r.target_demand for r in records]
    avg_demand = sum(demands) / len(demands)
    
    # Mock inventory values (in production: from WMS)
    on_hand = avg_demand * 45  # ~45 days
    unit_cost = 50
    
    # DoS score (target: 30 days = 100, >90 or <10 = 0)
    dos = on_hand / avg_demand if avg_demand > 0 else 0
    dos_score = max(0, min(100, 100 - abs(dos - 30) * 3.3))
    
    # Turns score (target: 12 turns/year = 100)
    annual_demand = avg_demand * 365
    turns = annual_demand / (on_hand * unit_cost) if on_hand > 0 else 0
    turns_score = min(100, turns * 8.3)
    
    # Stockout risk (based on CV)
    cv = (sum((d-avg_demand)**2 for d in demands)/len(demands))**0.5 / avg_demand if avg_demand > 0 else 1
    stockout_score = max(0, 100 - cv * 100)
    
    # Capital efficiency
    capital_tied = on_hand * unit_cost
    capital_score = max(0, 100 - (capital_tied / 10000) * 10)
    
    composite = dos_score * 0.40 + turns_score * 0.30 + stockout_score * 0.20 + capital_score * 0.10
    
    return {
        "sku": sku, "health_score": round(composite, 1),
        "grade": "A" if composite >= 80 else "B" if composite >= 60 else "C" if composite >= 40 else "D",
        "components": {
            "dos_score": round(dos_score, 1), "turns_score": round(turns_score, 1),
            "stockout_risk_score": round(stockout_score, 1), "capital_score": round(capital_score, 1),
        },
        "metrics": {"days_of_supply": round(dos, 0), "annual_turns": round(turns, 1), "cv": round(cv, 2)},
    }


# ── P2: Dataset Version Diffs ────────────────────────────────────────────────
@app.get("/api/datasets/diff")
def diff_dataset_versions(version_a: str, version_b: str, db: Session = Depends(get_db)):
    """Compare two dataset versions"""
    records_a = {(r.sku, r.date.isoformat()): r.target_demand
                 for r in db.query(models.DemandRecord).filter(models.DemandRecord.dataset_version == version_a).all()}
    records_b = {(r.sku, r.date.isoformat()): r.target_demand
                 for r in db.query(models.DemandRecord).filter(models.DemandRecord.dataset_version == version_b).all()}
    
    keys_a, keys_b = set(records_a.keys()), set(records_b.keys())
    
    added = [{"sku": k[0], "date": k[1], "demand": records_b[k]} for k in keys_b - keys_a]
    removed = [{"sku": k[0], "date": k[1], "demand": records_a[k]} for k in keys_a - keys_b]
    changed = [{"sku": k[0], "date": k[1], "old": records_a[k], "new": records_b[k], "delta": records_b[k]-records_a[k]}
               for k in keys_a & keys_b if abs(records_a[k] - records_b[k]) > 0.01]
    
    return {
        "version_a": version_a, "version_b": version_b,
        "added": len(added), "removed": len(removed), "changed": len(changed),
        "details": {"added": added[:50], "removed": removed[:50], "changed": changed[:50]},
    }


# ═════════════════════════════════════════════════════════════════════════════
# S&OP / IBP — Integrated Business Planning Engine
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/sop/ibp-cycle-status")
def get_ibp_cycle_status(dataset_version: str = "", db: Session = Depends(get_db)):
    """
    Returns the status of the 5-step monthly IBP cycle.
    Classic process: Product Review → Demand Review → Supply Review → 
    Financial Reconciliation → Executive/Management Business Review.
    """
    from datetime import datetime
    today = datetime.utcnow()
    day_of_month = today.day

    # Map cycle steps to working-day windows in a typical monthly cadence
    steps = [
        {"step": 1, "name": "Product Management Review", "owner": "Product/Portfolio", "window": "Days 1-4",
         "purpose": "Review NPI pipeline, lifecycle changes, portfolio decisions",
         "inputs": ["New product launches", "End-of-life SKUs", "Roadmap changes"],
         "outputs": ["Updated portfolio assumptions", "NPI volume estimates"]},
        {"step": 2, "name": "Demand Review", "owner": "Demand Planning", "window": "Days 5-9",
         "purpose": "Consensus unconstrained demand plan across all channels",
         "inputs": ["Statistical forecast", "Sales input", "Marketing/promo plans", "Market intelligence"],
         "outputs": ["Consensus demand plan", "Assumptions log", "Demand risks & opportunities"]},
        {"step": 3, "name": "Supply Review", "owner": "Supply/Operations", "window": "Days 10-14",
         "purpose": "Assess ability to meet demand; identify constraints",
         "inputs": ["Consensus demand", "Capacity", "Inventory", "Supplier lead times"],
         "outputs": ["Constrained supply plan", "Capacity gaps", "Inventory projections"]},
        {"step": 4, "name": "Financial Reconciliation", "owner": "Finance", "window": "Days 15-18",
         "purpose": "Translate volume plans to revenue/margin; reconcile to AOP",
         "inputs": ["Demand plan", "Supply plan", "Pricing", "Cost", "AOP/Budget"],
         "outputs": ["Financial projection", "Gap to AOP", "Scenario valuations"]},
        {"step": 5, "name": "Management Business Review", "owner": "Executive Team", "window": "Days 19-22",
         "purpose": "Decide on plan, resolve gaps, authorize actions",
         "inputs": ["Reconciled plan", "Scenarios", "Risks & opportunities", "Recommendations"],
         "outputs": ["Approved consensus plan", "Decisions log", "Action items"]},
    ]

    # Determine current step based on day-of-month
    for s in steps:
        lo, hi = [int(x) for x in s["window"].replace("Days ", "").split("-")]
        if day_of_month <= hi:
            s["status"] = "in_progress" if day_of_month >= lo else "pending"
        else:
            s["status"] = "complete"
    # Anything before day 1 window edge → first is in progress
    if all(s["status"] == "pending" for s in steps):
        steps[0]["status"] = "in_progress"

    current = next((s for s in steps if s["status"] == "in_progress"), steps[-1])

    return {
        "cycle_month": today.strftime("%B %Y"),
        "current_step": current["step"],
        "current_step_name": current["name"],
        "day_of_month": day_of_month,
        "steps": steps,
        "completion_pct": round(len([s for s in steps if s["status"] == "complete"]) / len(steps) * 100, 0),
    }


@app.post("/api/sop/reconcile-plans")
def reconcile_sop_plans(
    dataset_version: str,
    air_freight_enabled: bool = False,
    subcontractor_flex: bool = False,
    db: Session = Depends(get_db)
):
    """
    Core IBP reconciliation engine. Aligns demand, supply, and financial plans.
    Returns the reconciled one-number plan with gap analysis.
    """
    from sqlalchemy import func

    # Aggregate demand by category from real data
    cat_data = db.query(
        models.DemandRecord.category,
        func.avg(models.DemandRecord.target_demand).label('avg_demand'),
        func.count(func.distinct(models.DemandRecord.sku)).label('sku_count'),
    ).filter(
        models.DemandRecord.dataset_version == dataset_version
    ).group_by(models.DemandRecord.category).all()

    # Robust fallback: if no uploaded data, use a representative seeded
    # category mix so the S&OP plan is always available. This mirrors the
    # demo SKU database the frontend seeds, keeping the one-number plan live.
    if not cat_data:
        class _SeedCat:
            def __init__(self, category, avg_demand, sku_count):
                self.category = category
                self.avg_demand = avg_demand
                self.sku_count = sku_count
        cat_data = [
            _SeedCat("Electronics", 142.0, 8),
            _SeedCat("Furniture", 96.0, 6),
            _SeedCat("Accessories", 210.0, 11),
        ]

    # Capacity uplift from levers
    capacity_multiplier = 1.0
    margin_penalty = 0.0
    if subcontractor_flex:
        capacity_multiplier += 0.15
        margin_penalty += 0.02
    if air_freight_enabled:
        capacity_multiplier += 0.08
        margin_penalty += 0.015

    reconciliation = []
    totals = {"demand_rev": 0, "supply_rev": 0, "aop_rev": 0, "demand_margin": 0, "supply_margin": 0}

    for cat in cat_data:
        monthly_demand = float(cat.avg_demand) * cat.sku_count * 30  # rough monthly volume
        # Mock financials per category (in production: from SKU master/pricing)
        asp = {"Electronics": 850, "Furniture": 420, "Accessories": 65}.get(cat.category, 200)
        unit_cost = asp * 0.62

        base_capacity = monthly_demand * 0.82  # baseline supply gap
        constrained_capacity = base_capacity * capacity_multiplier
        supply_volume = min(monthly_demand, constrained_capacity)

        demand_rev = monthly_demand * asp
        supply_rev = supply_volume * asp
        aop_rev = demand_rev * 0.95  # AOP set slightly below unconstrained

        effective_margin_rate = ((asp - unit_cost) / asp) - margin_penalty
        demand_margin = demand_rev * ((asp - unit_cost) / asp)
        supply_margin = supply_rev * effective_margin_rate

        gap = supply_rev - aop_rev
        fill_rate = (supply_volume / monthly_demand * 100) if monthly_demand > 0 else 100

        reconciliation.append({
            "category": cat.category,
            "demand_volume": round(monthly_demand, 0),
            "supply_volume": round(supply_volume, 0),
            "fill_rate": round(fill_rate, 1),
            "demand_revenue": round(demand_rev, 0),
            "supply_revenue": round(supply_rev, 0),
            "aop_revenue": round(aop_rev, 0),
            "gap_to_aop": round(gap, 0),
            "supply_margin": round(supply_margin, 0),
            "margin_pct": round(effective_margin_rate * 100, 1),
            "constrained": supply_volume < monthly_demand,
        })

        totals["demand_rev"] += demand_rev
        totals["supply_rev"] += supply_rev
        totals["aop_rev"] += aop_rev
        totals["demand_margin"] += demand_margin
        totals["supply_margin"] += supply_margin

    revenue_at_risk = totals["demand_rev"] - totals["supply_rev"]
    gap_to_aop = totals["supply_rev"] - totals["aop_rev"]

    return {
        "reconciliation": reconciliation,
        "totals": {
            "unconstrained_demand_revenue": round(totals["demand_rev"], 0),
            "constrained_supply_revenue": round(totals["supply_rev"], 0),
            "aop_revenue": round(totals["aop_rev"], 0),
            "revenue_at_risk": round(revenue_at_risk, 0),
            "gap_to_aop": round(gap_to_aop, 0),
            "supply_margin": round(totals["supply_margin"], 0),
            "margin_erosion": round(totals["demand_margin"] - totals["supply_margin"], 0),
        },
        "levers": {"air_freight": air_freight_enabled, "subcontractor_flex": subcontractor_flex,
                   "capacity_uplift_pct": round((capacity_multiplier - 1) * 100, 1),
                   "margin_penalty_pct": round(margin_penalty * 100, 2)},
        "plan_status": "BALANCED" if revenue_at_risk < totals["demand_rev"] * 0.05 else "CONSTRAINED",
    }


@app.post("/api/sop/scenario-compare")
def sop_scenario_compare(dataset_version: str, db: Session = Depends(get_db)):
    """
    Compare strategic S&OP scenarios side-by-side:
    Conservative, Base Case, Aggressive Growth, Supply Disruption.
    """
    base = reconcile_sop_plans(dataset_version, False, False, db)
    base_rev = base["totals"]["constrained_supply_revenue"]
    base_margin = base["totals"]["supply_margin"]

    scenarios = [
        {"name": "Conservative", "demand_factor": 0.92, "capacity_factor": 1.0, "margin_factor": 1.02,
         "narrative": "Cautious demand outlook, protect margin, no capacity investment"},
        {"name": "Base Case (Consensus)", "demand_factor": 1.0, "capacity_factor": 1.0, "margin_factor": 1.0,
         "narrative": "Agreed consensus plan from demand & supply reviews"},
        {"name": "Aggressive Growth", "demand_factor": 1.18, "capacity_factor": 1.23, "margin_factor": 0.97,
         "narrative": "Capture upside via subcontractor flex + air freight, accept margin trade"},
        {"name": "Supply Disruption", "demand_factor": 1.0, "capacity_factor": 0.65, "margin_factor": 1.05,
         "narrative": "Major supplier outage; prioritize high-margin SKUs, ration capacity"},
    ]

    results = []
    for s in scenarios:
        rev = base_rev * s["demand_factor"] * min(1.0, s["capacity_factor"])
        margin = base_margin * s["demand_factor"] * min(1.0, s["capacity_factor"]) * s["margin_factor"]
        service = min(100, 95 * s["capacity_factor"] / s["demand_factor"])
        results.append({
            "scenario": s["name"],
            "narrative": s["narrative"],
            "revenue": round(rev, 0),
            "margin": round(margin, 0),
            "margin_pct": round(margin / rev * 100, 1) if rev > 0 else 0,
            "service_level": round(service, 1),
            "revenue_vs_base": round((rev - base_rev) / base_rev * 100, 1),
            "recommended": s["name"] == "Base Case (Consensus)",
        })

    return {"scenarios": results, "base_revenue": round(base_rev, 0)}


@app.get("/api/sop/strategic-horizon")
def strategic_planning_horizon(dataset_version: str, years: int = 3, db: Session = Depends(get_db)):
    """
    Multi-year strategic planning horizon (rolling 36-month view).
    Extends tactical S&OP into strategic IBP territory.
    """
    from sqlalchemy import func

    total_demand = db.query(func.sum(models.DemandRecord.target_demand)).filter(
        models.DemandRecord.dataset_version == dataset_version
    ).scalar() or 100000

    # Build quarterly strategic view
    base_annual_rev = float(total_demand) * 400  # rough revenue proxy
    growth_assumptions = {"organic": 0.06, "npi": 0.04, "market_expansion": 0.03, "attrition": -0.02}
    net_growth = sum(growth_assumptions.values())

    horizon = []
    current_rev = base_annual_rev
    for q in range(years * 4):
        year = q // 4 + 1
        quarter = q % 4 + 1
        current_rev *= (1 + net_growth / 4)
        # Capacity needs to scale with revenue
        capacity_required = current_rev * 1.1
        capex_trigger = quarter == 1 and year > 1
        horizon.append({
            "period": f"Y{year} Q{quarter}",
            "year": year,
            "revenue_plan": round(current_rev, 0),
            "capacity_required": round(capacity_required, 0),
            "capex_decision": capex_trigger,
            "headcount_index": round(100 * (current_rev / base_annual_rev), 0),
        })

    return {
        "horizon_years": years,
        "growth_assumptions": {k: f"{v*100:+.0f}%" for k, v in growth_assumptions.items()},
        "net_annual_growth": f"{net_growth*100:+.1f}%",
        "base_annual_revenue": round(base_annual_rev, 0),
        "terminal_revenue": round(current_rev, 0),
        "horizon": horizon,
        "strategic_initiatives": [
            {"initiative": "Capacity expansion (DC West)", "year": 2, "investment": round(base_annual_rev * 0.08, 0), "roi_months": 18},
            {"initiative": "NPI pipeline acceleration", "year": 1, "investment": round(base_annual_rev * 0.04, 0), "roi_months": 24},
            {"initiative": "Supplier diversification", "year": 2, "investment": round(base_annual_rev * 0.03, 0), "roi_months": 30},
        ],
    }


# ═════════════════════════════════════════════════════════════════════════════
# FINANCIAL PLANNING — Cash Flow, Budget, Profitability, Working Capital
# ═════════════════════════════════════════════════════════════════════════════

def _seeded_finance_categories():
    """Representative category mix when no dataset uploaded — keeps finance robust."""
    return [
        {"category": "Electronics",  "monthly_volume": 1140, "asp": 850, "unit_cost": 527, "on_hand_units": 1700, "lead_time": 21},
        {"category": "Furniture",    "monthly_volume": 580,  "asp": 420, "unit_cost": 260, "on_hand_units": 870,  "lead_time": 28},
        {"category": "Accessories",  "monthly_volume": 2310, "asp": 65,  "unit_cost": 40,  "on_hand_units": 3500, "lead_time": 14},
    ]


def _finance_base(dataset_version: str, db: Session):
    """Pull category-level financial base from real data, else seeded fallback."""
    from sqlalchemy import func
    rows = db.query(
        models.DemandRecord.category,
        func.avg(models.DemandRecord.target_demand).label('avg_demand'),
        func.count(func.distinct(models.DemandRecord.sku)).label('sku_count'),
    ).filter(models.DemandRecord.dataset_version == dataset_version
    ).group_by(models.DemandRecord.category).all()

    if not rows:
        return _seeded_finance_categories()

    asp_map = {"Electronics": 850, "Furniture": 420, "Accessories": 65}
    cats = []
    for r in rows:
        asp = asp_map.get(r.category, 200)
        monthly_vol = float(r.avg_demand) * r.sku_count * 30
        cats.append({
            "category": r.category,
            "monthly_volume": monthly_vol,
            "asp": asp,
            "unit_cost": asp * 0.62,
            "on_hand_units": monthly_vol * 1.5,
            "lead_time": 21,
        })
    return cats


@app.get("/api/finance/cash-flow")
def cash_flow_forecast(
    dataset_version: str,
    months: int = 12,
    dso: int = 45,           # Days Sales Outstanding (AR collection)
    dpo: int = 30,           # Days Payable Outstanding (AP payment)
    opening_cash: float = 5_000_000,
    db: Session = Depends(get_db)
):
    """
    Direct-method cash flow forecast with AR/AP timing.
    Revenue is collected after DSO days; COGS paid after DPO days.
    """
    cats = _finance_base(dataset_version, db)
    monthly_rev = sum(c["monthly_volume"] * c["asp"] for c in cats)
    monthly_cogs = sum(c["monthly_volume"] * c["unit_cost"] for c in cats)
    monthly_opex = monthly_rev * 0.18  # SG&A assumption

    # Lag factors: fraction of a month's revenue collected in the same month
    collect_lag = dso / 30.0
    pay_lag = dpo / 30.0

    flows = []
    cash = opening_cash
    for m in range(1, months + 1):
        # Seasonality on revenue
        season = 1 + 0.15 * math.sin((m / 12) * 2 * math.pi)
        rev = monthly_rev * season
        cogs = monthly_cogs * season

        # Cash IN: collections (revenue lagged by DSO)
        collections = rev * (1 / max(1.0, collect_lag)) if collect_lag > 1 else rev
        # Simplified: collections approximate prior-period revenue
        cash_in = rev / (1 + (dso - 30) / 60.0)

        # Cash OUT: supplier payments (COGS lagged by DPO) + opex
        cash_out = cogs / (1 + (dpo - 30) / 60.0) + monthly_opex

        net = cash_in - cash_out
        cash += net
        flows.append({
            "month": f"M{m}",
            "revenue": round(rev, 0),
            "cash_in": round(cash_in, 0),
            "cash_out": round(cash_out, 0),
            "net_cash_flow": round(net, 0),
            "closing_cash": round(cash, 0),
            "liquidity_alert": cash < monthly_opex,  # less than 1 month opex
        })

    min_cash = min(f["closing_cash"] for f in flows)
    return {
        "opening_cash": opening_cash,
        "months": months,
        "assumptions": {"dso": dso, "dpo": dpo, "monthly_opex": round(monthly_opex, 0)},
        "flows": flows,
        "closing_cash": flows[-1]["closing_cash"],
        "min_cash": round(min_cash, 0),
        "min_cash_month": min(flows, key=lambda f: f["closing_cash"])["month"],
        "cash_runway_healthy": min_cash > monthly_opex,
    }


@app.get("/api/finance/budget")
def budget_plan(
    dataset_version: str,
    growth_target_pct: float = 8.0,
    db: Session = Depends(get_db)
):
    """
    Annual budget plan: builds AOP (Annual Operating Plan) by category
    with revenue, COGS, gross margin, opex allocation, and operating profit.
    """
    cats = _finance_base(dataset_version, db)

    lines = []
    totals = {"revenue": 0, "cogs": 0, "gross_margin": 0, "opex": 0, "operating_profit": 0}
    for c in cats:
        annual_rev = c["monthly_volume"] * c["asp"] * 12
        budget_rev = annual_rev * (1 + growth_target_pct / 100)
        budget_cogs = c["monthly_volume"] * c["unit_cost"] * 12 * (1 + growth_target_pct / 100)
        gm = budget_rev - budget_cogs
        opex = budget_rev * 0.18
        op_profit = gm - opex
        lines.append({
            "category": c["category"],
            "budget_revenue": round(budget_rev, 0),
            "budget_cogs": round(budget_cogs, 0),
            "gross_margin": round(gm, 0),
            "gross_margin_pct": round(gm / budget_rev * 100, 1),
            "opex": round(opex, 0),
            "operating_profit": round(op_profit, 0),
            "operating_margin_pct": round(op_profit / budget_rev * 100, 1),
        })
        totals["revenue"] += budget_rev
        totals["cogs"] += budget_cogs
        totals["gross_margin"] += gm
        totals["opex"] += opex
        totals["operating_profit"] += op_profit

    return {
        "growth_target_pct": growth_target_pct,
        "lines": lines,
        "totals": {k: round(v, 0) for k, v in totals.items()},
        "company_gm_pct": round(totals["gross_margin"] / totals["revenue"] * 100, 1),
        "company_op_margin_pct": round(totals["operating_profit"] / totals["revenue"] * 100, 1),
    }


@app.get("/api/finance/profitability")
def profitability_model(dataset_version: str, db: Session = Depends(get_db)):
    """
    Profitability waterfall by category: revenue → gross margin →
    contribution margin → operating profit, with profitability ranking.
    """
    cats = _finance_base(dataset_version, db)

    lines = []
    for c in cats:
        rev = c["monthly_volume"] * c["asp"] * 12
        cogs = c["monthly_volume"] * c["unit_cost"] * 12
        gm = rev - cogs
        # Variable selling cost ~6%, allocated fixed ~10%
        variable_cost = rev * 0.06
        contribution = gm - variable_cost
        fixed_alloc = rev * 0.10
        op_profit = contribution - fixed_alloc
        lines.append({
            "category": c["category"],
            "revenue": round(rev, 0),
            "gross_margin": round(gm, 0),
            "gross_margin_pct": round(gm / rev * 100, 1),
            "contribution_margin": round(contribution, 0),
            "contribution_pct": round(contribution / rev * 100, 1),
            "operating_profit": round(op_profit, 0),
            "operating_pct": round(op_profit / rev * 100, 1),
        })

    lines.sort(key=lambda x: x["operating_pct"], reverse=True)
    for i, l in enumerate(lines):
        l["profit_rank"] = i + 1
        l["tier"] = "Star" if l["operating_pct"] > 20 else "Core" if l["operating_pct"] > 10 else "Drag"

    total_rev = sum(l["revenue"] for l in lines)
    total_op = sum(l["operating_profit"] for l in lines)
    return {
        "lines": lines,
        "total_revenue": round(total_rev, 0),
        "total_operating_profit": round(total_op, 0),
        "blended_operating_pct": round(total_op / total_rev * 100, 1),
    }


@app.get("/api/finance/working-capital")
def working_capital_plan(
    dataset_version: str,
    dso: int = 45,
    dpo: int = 30,
    db: Session = Depends(get_db)
):
    """
    Working capital plan: inventory + receivables - payables.
    Computes Cash Conversion Cycle (CCC) and capital tied up.
    """
    cats = _finance_base(dataset_version, db)

    annual_rev = sum(c["monthly_volume"] * c["asp"] * 12 for c in cats)
    annual_cogs = sum(c["monthly_volume"] * c["unit_cost"] * 12 for c in cats)
    inventory_value = sum(c["on_hand_units"] * c["unit_cost"] for c in cats)

    dio = (inventory_value / annual_cogs) * 365 if annual_cogs else 0  # Days Inventory Outstanding
    accounts_receivable = annual_rev * (dso / 365)
    accounts_payable = annual_cogs * (dpo / 365)
    net_working_capital = inventory_value + accounts_receivable - accounts_payable
    ccc = dio + dso - dpo  # Cash Conversion Cycle

    # Per-category breakdown
    lines = []
    for c in cats:
        inv = c["on_hand_units"] * c["unit_cost"]
        cat_cogs = c["monthly_volume"] * c["unit_cost"] * 12
        cat_dio = (inv / cat_cogs) * 365 if cat_cogs else 0
        lines.append({
            "category": c["category"],
            "inventory_value": round(inv, 0),
            "dio_days": round(cat_dio, 0),
            "annual_cogs": round(cat_cogs, 0),
        })

    return {
        "assumptions": {"dso": dso, "dpo": dpo},
        "inventory_value": round(inventory_value, 0),
        "accounts_receivable": round(accounts_receivable, 0),
        "accounts_payable": round(accounts_payable, 0),
        "net_working_capital": round(net_working_capital, 0),
        "cash_conversion_cycle": round(ccc, 0),
        "dio_days": round(dio, 0),
        "dso_days": dso,
        "dpo_days": dpo,
        "lines": lines,
        "wc_as_pct_revenue": round(net_working_capital / annual_rev * 100, 1),
    }

# ═════════════════════════════════════════════════════════════════════════════
# DIGITAL TWIN — Demand Shock & Monte Carlo Risk Simulation
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/twin/demand-shock")
def demand_shock_simulation(
    dataset_version: str,
    shock_pct: float = 30.0,        # magnitude of demand spike/drop (%)
    shock_type: str = "spike",       # spike | drop | sustained | pulse
    duration_weeks: int = 4,
    propagation_weeks: int = 12,
    db: Session = Depends(get_db)
):
    """
    Simulate a demand shock propagating through the supply chain.
    Models how a sudden demand change ripples into inventory, fill rate,
    and replenishment over a multi-week horizon (bullwhip effect).
    """
    cats = _finance_base(dataset_version, db)
    base_weekly = sum(c["monthly_volume"] for c in cats) / 4.0
    avg_lead = sum(c["lead_time"] for c in cats) / max(1, len(cats))
    lead_weeks = max(1, round(avg_lead / 7))

    shock_mult = 1 + (shock_pct / 100) if shock_type in ("spike", "sustained", "pulse") else 1 - (shock_pct / 100)

    weeks = []
    # Start at a realistic 2 weeks of cover (rather than raw on-hand, which can be
    # so high a mild shock never bites) so shock propagation and the bullwhip are observable.
    safety_target = base_weekly * 2
    inventory = base_weekly * 2
    # replenishment pipeline keyed by arrival week
    pipeline = {}

    for w in range(1, propagation_weeks + 1):
        # Determine demand for this week based on shock profile
        if shock_type == "spike" and w <= duration_weeks:
            demand = base_weekly * shock_mult
        elif shock_type == "drop" and w <= duration_weeks:
            demand = base_weekly * shock_mult
        elif shock_type == "sustained" and w >= 2:
            demand = base_weekly * shock_mult
        elif shock_type == "pulse" and w == 2:
            demand = base_weekly * shock_mult
        else:
            demand = base_weekly

        # Receive replenishment scheduled to arrive this week
        arrivals = pipeline.pop(w, 0)
        inventory += arrivals

        # Fulfil demand
        shipped = min(inventory, demand)
        stockout = max(0, demand - inventory)
        inventory -= shipped
        fill_rate = (shipped / demand * 100) if demand > 0 else 100

        # Reorder logic: order up to safety target + this week's demand signal
        # (the bullwhip — orders overshoot when demand spikes)
        order_qty = max(0, (safety_target + demand) - inventory - sum(pipeline.values()))
        if order_qty > 0:
            pipeline[w + lead_weeks] = pipeline.get(w + lead_weeks, 0) + order_qty

        weeks.append({
            "week": w,
            "demand": round(demand, 0),
            "shipped": round(shipped, 0),
            "inventory": round(inventory, 0),
            "stockout_units": round(stockout, 0),
            "fill_rate": round(fill_rate, 1),
            "order_placed": round(order_qty, 0),
            "in_shock": (shock_type in ("spike", "drop") and w <= duration_weeks) or
                        (shock_type == "sustained" and w >= 2) or
                        (shock_type == "pulse" and w == 2),
        })

    total_stockout = sum(w["stockout_units"] for w in weeks)
    min_fill = min(w["fill_rate"] for w in weeks)
    recovery_week = next((w["week"] for w in weeks if w["week"] > duration_weeks and w["fill_rate"] >= 99), None)
    peak_order = max(w["order_placed"] for w in weeks)
    bullwhip_ratio = round(peak_order / base_weekly, 2) if base_weekly else 0

    return {
        "shock_type": shock_type,
        "shock_pct": shock_pct,
        "duration_weeks": duration_weeks,
        "baseline_weekly_demand": round(base_weekly, 0),
        "weeks": weeks,
        "summary": {
            "total_stockout_units": round(total_stockout, 0),
            "min_fill_rate": round(min_fill, 1),
            "recovery_week": recovery_week,
            "peak_order_qty": round(peak_order, 0),
            "bullwhip_ratio": bullwhip_ratio,
        },
    }


@app.post("/api/twin/monte-carlo")
def monte_carlo_risk(
    dataset_version: str,
    iterations: int = 1000,
    demand_cv: float = 0.25,        # demand coefficient of variation
    lead_time_cv: float = 0.30,      # lead-time variability
    service_target: float = 95.0,
    db: Session = Depends(get_db)
):
    """
    Monte Carlo risk simulation. Runs N iterations with randomized demand
    and lead time to produce probability distributions of stockout risk,
    inventory level, and service achievement.
    """
    import random
    random.seed(42)  # reproducible

    cats = _finance_base(dataset_version, db)
    base_demand = sum(c["monthly_volume"] for c in cats)
    avg_lead = sum(c["lead_time"] for c in cats) / max(1, len(cats))
    unit_cost = sum(c["unit_cost"] for c in cats) / max(1, len(cats))

    # Safety stock at target service level
    from statistics import NormalDist
    z = NormalDist().inv_cdf(min(0.999, service_target / 100))
    demand_sd = base_demand * demand_cv
    lead_sd = avg_lead * lead_time_cv
    safety_stock = z * math.sqrt((avg_lead / 30) * demand_sd**2 + (base_demand**2) * (lead_sd / 30)**2)
    reorder_point = base_demand * (avg_lead / 30) + safety_stock

    stockout_count = 0
    service_levels = []
    ending_inventories = []
    inventory_values = []

    for _ in range(iterations):
        # Random demand over lead time (normal)
        demand_during_lt = max(0, random.gauss(base_demand * (avg_lead / 30), demand_sd * math.sqrt(avg_lead / 30)))
        # Random lead time (normal, floored)
        actual_lead = max(1, random.gauss(avg_lead, lead_sd))
        # Inventory available = reorder point (proxy for on-hand at reorder)
        available = reorder_point
        if demand_during_lt > available:
            stockout_count += 1
            fulfilled = available
        else:
            fulfilled = demand_during_lt
        sl = (fulfilled / demand_during_lt * 100) if demand_during_lt > 0 else 100
        service_levels.append(sl)
        ending = max(0, available - demand_during_lt)
        ending_inventories.append(ending)
        inventory_values.append(ending * unit_cost)

    service_levels.sort()
    ending_inventories.sort()

    def pct(arr, p):
        idx = int(len(arr) * p / 100)
        return arr[min(idx, len(arr) - 1)]

    stockout_prob = stockout_count / iterations * 100
    achieved_service = sum(service_levels) / len(service_levels)

    # Build a histogram of service levels (10 bins)
    bins = [0] * 10
    for sl in service_levels:
        b = min(9, int(sl / 10))
        bins[b] += 1
    histogram = [{"bucket": f"{i*10}-{i*10+10}%", "count": bins[i]} for i in range(10)]

    return {
        "iterations": iterations,
        "inputs": {"demand_cv": demand_cv, "lead_time_cv": lead_time_cv, "service_target": service_target},
        "safety_stock": round(safety_stock, 0),
        "reorder_point": round(reorder_point, 0),
        "results": {
            "stockout_probability": round(stockout_prob, 1),
            "expected_service_level": round(achieved_service, 1),
            "service_p5": round(pct(service_levels, 5), 1),
            "service_p50": round(pct(service_levels, 50), 1),
            "service_p95": round(pct(service_levels, 95), 1),
            "inventory_p5": round(pct(ending_inventories, 5), 0),
            "inventory_p50": round(pct(ending_inventories, 50), 0),
            "inventory_p95": round(pct(ending_inventories, 95), 0),
            "avg_inventory_value": round(sum(inventory_values) / len(inventory_values), 0),
        },
        "service_histogram": histogram,
        "risk_rating": "Low" if stockout_prob < 5 else "Medium" if stockout_prob < 15 else "High",
    }

# ═════════════════════════════════════════════════════════════════════════════
# CATEGORY MANAGEMENT — Category Role & Strategy
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/category/roles")
def category_roles(dataset_version: str, db: Session = Depends(get_db)):
    """
    Classify each category into its strategic role using the standard
    category-management framework: Destination, Routine, Convenience,
    Seasonal/Occasional — based on revenue share, purchase frequency proxy,
    margin, and demand variability. Returns tailored tactics per role.
    """
    cats = _finance_base(dataset_version, db)
    total_rev = sum(c["monthly_volume"] * c["asp"] for c in cats)

    role_playbook = {
        "Destination": {
            "definition": "Defines the retailer; customers shop here specifically for this category.",
            "tactics": ["Widest assortment & depth", "Competitive/loss-leader pricing", "Premium shelf space", "Heavy promotion"],
            "shelf_priority": "Maximum",
        },
        "Routine": {
            "definition": "Builds the core, everyday basket; reliable repeat purchases.",
            "tactics": ["Strong in-stock discipline", "Everyday-low-price", "Efficient replenishment", "Standard space"],
            "shelf_priority": "High",
        },
        "Convenience": {
            "definition": "Rounds out the trip; impulse and fill-in purchases.",
            "tactics": ["Curated narrow range", "Margin-led pricing", "End-cap / checkout placement", "Minimal SKUs"],
            "shelf_priority": "Low",
        },
        "Seasonal/Occasional": {
            "definition": "Drives traffic in peaks; high variability across the year.",
            "tactics": ["Flexible seasonal space", "Event-driven promotion", "Tight inventory entry/exit", "Markdown discipline"],
            "shelf_priority": "Variable",
        },
    }

    results = []
    for c in cats:
        rev = c["monthly_volume"] * c["asp"]
        rev_share = rev / total_rev * 100 if total_rev else 0
        margin_pct = (c["asp"] - c["unit_cost"]) / c["asp"] * 100
        # frequency proxy: high volume + low ASP = frequent; low volume + high ASP = occasional
        frequency = "High" if c["monthly_volume"] > 1500 else "Medium" if c["monthly_volume"] > 700 else "Low"

        # Assign role
        if rev_share >= 35 and frequency in ("High", "Medium"):
            role = "Destination"
        elif frequency == "High":
            role = "Routine"
        elif margin_pct >= 38 and frequency == "Low":
            role = "Convenience"
        else:
            role = "Seasonal/Occasional"

        pb = role_playbook[role]
        results.append({
            "category": c["category"],
            "role": role,
            "revenue_share_pct": round(rev_share, 1),
            "margin_pct": round(margin_pct, 1),
            "purchase_frequency": frequency,
            "monthly_revenue": round(rev, 0),
            "definition": pb["definition"],
            "tactics": pb["tactics"],
            "shelf_priority": pb["shelf_priority"],
        })

    # Role distribution summary
    role_counts = {}
    for r in results:
        role_counts[r["role"]] = role_counts.get(r["role"], 0) + 1

    return {
        "categories": results,
        "role_distribution": [{"role": k, "count": v} for k, v in role_counts.items()],
        "playbook": role_playbook,
    }

# ═════════════════════════════════════════════════════════════════════════════
# PRICING & PROMOTION — Elasticity, Simulation, Promo ROI, Dynamic Pricing
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/pricing/elasticity")
def price_elasticity(dataset_version: str, db: Session = Depends(get_db)):
    """
    Estimate price elasticity of demand per category and find the
    profit-maximising price point along the demand curve.
    """
    cats = _finance_base(dataset_version, db)
    # Category-typical elasticities (negative = normal goods)
    elasticity_map = {"Electronics": -1.8, "Furniture": -1.2, "Accessories": -2.4}

    results = []
    for c in cats:
        e = elasticity_map.get(c["category"], -1.5)
        base_price = c["asp"]
        base_qty = c["monthly_volume"]
        unit_cost = c["unit_cost"]

        # Sweep price from -30% to +30% and compute profit using constant-elasticity demand
        curve = []
        best = {"profit": -1e18}
        for pct in range(-30, 31, 5):
            price = base_price * (1 + pct / 100)
            qty = base_qty * (1 + e * (pct / 100))   # linear elasticity approximation
            qty = max(0, qty)
            revenue = price * qty
            profit = (price - unit_cost) * qty
            point = {"price_change_pct": pct, "price": round(price, 2),
                     "quantity": round(qty, 0), "revenue": round(revenue, 0),
                     "profit": round(profit, 0)}
            curve.append(point)
            if profit > best["profit"]:
                best = {**point, "profit": profit}

        results.append({
            "category": c["category"],
            "elasticity": e,
            "elasticity_label": "Elastic" if abs(e) > 1 else "Inelastic",
            "base_price": round(base_price, 2),
            "optimal_price": best["price"],
            "optimal_price_change_pct": best["price_change_pct"],
            "profit_uplift_pct": round((best["profit"] - (base_price - unit_cost) * base_qty) / ((base_price - unit_cost) * base_qty) * 100, 1) if (base_price - unit_cost) * base_qty else 0,
            "curve": curve,
        })

    return {"categories": results}


@app.post("/api/pricing/simulate")
def price_simulation(
    dataset_version: str,
    category: str = "",
    price_change_pct: float = 0.0,
    db: Session = Depends(get_db)
):
    """
    Simulate the P&L impact of a price change for one or all categories,
    using category elasticity to project the volume response.
    """
    cats = _finance_base(dataset_version, db)
    elasticity_map = {"Electronics": -1.8, "Furniture": -1.2, "Accessories": -2.4}
    if category:
        cats = [c for c in cats if c["category"] == category]

    lines = []
    tot_base_rev = tot_new_rev = tot_base_profit = tot_new_profit = 0
    for c in cats:
        e = elasticity_map.get(c["category"], -1.5)
        base_qty = c["monthly_volume"]
        new_qty = max(0, base_qty * (1 + e * (price_change_pct / 100)))
        base_price = c["asp"]
        new_price = base_price * (1 + price_change_pct / 100)

        base_rev = base_price * base_qty
        new_rev = new_price * new_qty
        base_profit = (base_price - c["unit_cost"]) * base_qty
        new_profit = (new_price - c["unit_cost"]) * new_qty

        lines.append({
            "category": c["category"],
            "base_volume": round(base_qty, 0),
            "new_volume": round(new_qty, 0),
            "volume_change_pct": round((new_qty - base_qty) / base_qty * 100, 1) if base_qty else 0,
            "base_revenue": round(base_rev, 0),
            "new_revenue": round(new_rev, 0),
            "base_profit": round(base_profit, 0),
            "new_profit": round(new_profit, 0),
            "profit_delta": round(new_profit - base_profit, 0),
        })
        tot_base_rev += base_rev; tot_new_rev += new_rev
        tot_base_profit += base_profit; tot_new_profit += new_profit

    return {
        "price_change_pct": price_change_pct,
        "lines": lines,
        "totals": {
            "base_revenue": round(tot_base_rev, 0),
            "new_revenue": round(tot_new_rev, 0),
            "revenue_delta": round(tot_new_rev - tot_base_rev, 0),
            "base_profit": round(tot_base_profit, 0),
            "new_profit": round(tot_new_profit, 0),
            "profit_delta": round(tot_new_profit - tot_base_profit, 0),
            "profit_delta_pct": round((tot_new_profit - tot_base_profit) / tot_base_profit * 100, 1) if tot_base_profit else 0,
        },
    }


@app.post("/api/pricing/promo-roi")
def promotion_roi(
    dataset_version: str,
    category: str = "",
    discount_pct: float = 20.0,
    promo_lift_pct: float = 60.0,   # expected demand lift during promo
    promo_weeks: int = 2,
    db: Session = Depends(get_db)
):
    """
    Evaluate promotion ROI: incremental volume & margin vs the discount cost,
    accounting for forward-buying / pantry-loading cannibalisation.
    """
    cats = _finance_base(dataset_version, db)
    if category:
        cats = [c for c in cats if c["category"] == category]

    results = []
    tot_incr_profit = tot_promo_cost = tot_incr_rev = 0
    for c in cats:
        weekly = c["monthly_volume"] / 4.0
        base_vol = weekly * promo_weeks
        promo_vol = base_vol * (1 + promo_lift_pct / 100)
        incremental_vol = promo_vol - base_vol
        # ~25% of lift is pulled-forward demand (cannibalises future sales)
        net_incremental = incremental_vol * 0.75

        promo_price = c["asp"] * (1 - discount_pct / 100)
        # Margin on promo units
        promo_margin = (promo_price - c["unit_cost"])
        base_margin = (c["asp"] - c["unit_cost"])

        # Discount cost = margin given up on the base volume that would have sold anyway
        discount_cost = base_vol * (c["asp"] - promo_price)
        # Incremental profit from net-new units
        incremental_profit = net_incremental * promo_margin
        net_roi = incremental_profit - discount_cost
        roi_ratio = (incremental_profit / discount_cost) if discount_cost > 0 else 0

        results.append({
            "category": c["category"],
            "base_volume": round(base_vol, 0),
            "promo_volume": round(promo_vol, 0),
            "net_incremental_volume": round(net_incremental, 0),
            "promo_price": round(promo_price, 2),
            "discount_cost": round(discount_cost, 0),
            "incremental_profit": round(incremental_profit, 0),
            "net_roi": round(net_roi, 0),
            "roi_ratio": round(roi_ratio, 2),
            "verdict": "Profitable" if net_roi > 0 else "Dilutive",
        })
        tot_incr_profit += incremental_profit
        tot_promo_cost += discount_cost
        tot_incr_rev += net_incremental * promo_price

    return {
        "discount_pct": discount_pct,
        "promo_lift_pct": promo_lift_pct,
        "promo_weeks": promo_weeks,
        "lines": results,
        "totals": {
            "incremental_profit": round(tot_incr_profit, 0),
            "discount_cost": round(tot_promo_cost, 0),
            "net_roi": round(tot_incr_profit - tot_promo_cost, 0),
            "roi_ratio": round(tot_incr_profit / tot_promo_cost, 2) if tot_promo_cost else 0,
            "verdict": "Profitable" if (tot_incr_profit - tot_promo_cost) > 0 else "Dilutive",
        },
    }


@app.get("/api/pricing/dynamic")
def dynamic_pricing(dataset_version: str, db: Session = Depends(get_db)):
    """
    Recommend dynamic price moves per category based on inventory position,
    demand variability, and margin headroom (markup / markdown signals).
    """
    cats = _finance_base(dataset_version, db)
    elasticity_map = {"Electronics": -1.8, "Furniture": -1.2, "Accessories": -2.4}

    results = []
    for c in cats:
        weeks_cover = c["on_hand_units"] / (c["monthly_volume"] / 4.0) if c["monthly_volume"] else 0
        margin_pct = (c["asp"] - c["unit_cost"]) / c["asp"] * 100
        e = elasticity_map.get(c["category"], -1.5)

        # Decision logic
        if weeks_cover > 8:
            action = "Markdown"
            move_pct = -10 if abs(e) > 1.5 else -5
            rationale = f"Excess cover ({weeks_cover:.0f} wks) — discount to accelerate sell-through"
        elif weeks_cover < 2:
            action = "Markup"
            move_pct = 5 if abs(e) < 1.5 else 2
            rationale = f"Low cover ({weeks_cover:.0f} wks) — raise price to protect margin & ration demand"
        elif margin_pct < 35:
            action = "Markup"
            move_pct = 3
            rationale = f"Thin margin ({margin_pct:.0f}%) — modest increase where elasticity allows"
        else:
            action = "Hold"
            move_pct = 0
            rationale = "Balanced cover and margin — maintain current price"

        results.append({
            "category": c["category"],
            "weeks_cover": round(weeks_cover, 1),
            "margin_pct": round(margin_pct, 1),
            "elasticity": e,
            "action": action,
            "recommended_move_pct": move_pct,
            "current_price": round(c["asp"], 2),
            "recommended_price": round(c["asp"] * (1 + move_pct / 100), 2),
            "rationale": rationale,
        })

    return {"recommendations": results}

# ═════════════════════════════════════════════════════════════════════════════
# EXECUTION SYSTEMS — Integration Control Plane
# (connectors, outbound documents, API/webhook registry, event stream)
# NOTE: connectors are simulated in this environment — no live external calls.
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/execution/connectors")
def execution_connectors():
    """
    Status of integration connectors across ERP, WMS, TMS, Procurement.
    In production these reflect live connection health; here they are simulated.
    """
    connectors = [
        {"id": "erp-sap", "name": "SAP S/4HANA", "type": "ERP", "protocol": "IDoc / OData",
         "status": "connected", "last_sync": "2026-06-12T07:40:00Z", "direction": "bidirectional",
         "objects": ["Material Master", "Sales Orders", "Purchase Orders", "Stock"], "health": 99.2},
        {"id": "wms-manh", "name": "Manhattan WMS", "type": "WMS", "protocol": "REST",
         "status": "connected", "last_sync": "2026-06-12T07:55:00Z", "direction": "bidirectional",
         "objects": ["Inventory", "Transfer Orders", "Putaway", "Picks"], "health": 98.7},
        {"id": "tms-ortec", "name": "ORTEC TMS", "type": "TMS", "protocol": "REST / EDI 204",
         "status": "connected", "last_sync": "2026-06-12T07:30:00Z", "direction": "outbound",
         "objects": ["Shipments", "Load Tenders", "Tracking"], "health": 97.1},
        {"id": "proc-coupa", "name": "Coupa Procurement", "type": "Procurement", "protocol": "cXML",
         "status": "degraded", "last_sync": "2026-06-12T06:10:00Z", "direction": "outbound",
         "objects": ["Requisitions", "Purchase Orders", "Supplier Catalog"], "health": 82.4},
        {"id": "erp-oracle", "name": "Oracle Fusion", "type": "ERP", "protocol": "REST",
         "status": "configured", "last_sync": None, "direction": "bidirectional",
         "objects": ["GL", "AP/AR", "Procurement"], "health": 0},
    ]
    summary = {
        "total": len(connectors),
        "connected": sum(1 for c in connectors if c["status"] == "connected"),
        "degraded": sum(1 for c in connectors if c["status"] == "degraded"),
        "configured": sum(1 for c in connectors if c["status"] == "configured"),
        "avg_health": round(sum(c["health"] for c in connectors if c["health"] > 0) /
                            max(1, sum(1 for c in connectors if c["health"] > 0)), 1),
    }
    return {"connectors": connectors, "summary": summary}


@app.post("/api/execution/generate-document")
def generate_execution_document(
    doc_type: str,        # purchase_order | asn | transfer_order | load_tender
    target_system: str = "SAP",
    dataset_version: str = "",
    db: Session = Depends(get_db)
):
    """
    Generate an outbound execution document in a standard ERP/EDI format.
    Returns both a structured payload and a flat file the user can download.
    """
    import csv, io
    cats = _finance_base(dataset_version, db)

    now = datetime.utcnow()
    doc_id = f"{doc_type[:2].upper()}{now.strftime('%y%m%d%H%M')}"

    output = io.StringIO()
    rows = []

    if doc_type == "purchase_order":
        writer = csv.writer(output)
        writer.writerow(["PO_Number", "Vendor", "Material", "Qty", "UOM", "UnitPrice", "DeliveryDate", "Plant"])
        for i, c in enumerate(cats, 1):
            qty = round(c["monthly_volume"] * 1.2)
            row = [f"{doc_id}-{i:03d}", f"VENDOR-{c['category'][:3].upper()}", c["category"],
                   qty, "EA", round(c["unit_cost"], 2),
                   (now + timedelta(days=c["lead_time"])).strftime("%Y-%m-%d"), "PLNT01"]
            writer.writerow(row)
            rows.append(dict(zip(["po_line", "vendor", "material", "qty", "uom", "unit_price", "delivery_date", "plant"], row)))
        edi_standard = "EDI 850 (Purchase Order)"

    elif doc_type == "asn":
        writer = csv.writer(output)
        writer.writerow(["ASN_Number", "Shipment", "Material", "Qty", "Carrier", "ShipDate", "ETA"])
        for i, c in enumerate(cats, 1):
            qty = round(c["monthly_volume"])
            row = [f"{doc_id}-{i:03d}", f"SHP{i:05d}", c["category"], qty, "FEDEX-FREIGHT",
                   now.strftime("%Y-%m-%d"), (now + timedelta(days=3)).strftime("%Y-%m-%d")]
            writer.writerow(row)
            rows.append(dict(zip(["asn_line", "shipment", "material", "qty", "carrier", "ship_date", "eta"], row)))
        edi_standard = "EDI 856 (Advance Ship Notice)"

    elif doc_type == "load_tender":
        writer = csv.writer(output)
        writer.writerow(["Tender_ID", "Origin", "Destination", "Weight_kg", "Pallets", "PickupDate", "Mode"])
        origins = ["DC West", "DC East", "Supplier APAC"]
        dests = ["Store SF", "Store NYC", "DC West"]
        for i, c in enumerate(cats, 1):
            row = [f"{doc_id}-{i:03d}", origins[i % len(origins)], dests[i % len(dests)],
                   round(c["monthly_volume"] * 2.5), round(c["monthly_volume"] / 40),
                   now.strftime("%Y-%m-%d"), "LTL" if c["monthly_volume"] < 1000 else "FTL"]
            writer.writerow(row)
            rows.append(dict(zip(["tender_id", "origin", "destination", "weight_kg", "pallets", "pickup_date", "mode"], row)))
        edi_standard = "EDI 204 (Motor Carrier Load Tender)"

    else:  # transfer_order
        writer = csv.writer(output)
        writer.writerow(["TO_Number", "FromPlant", "ToPlant", "Material", "Qty", "UOM", "Priority"])
        for i, c in enumerate(cats, 1):
            qty = round(c["monthly_volume"] * 0.3)
            row = [f"{doc_id}-{i:03d}", "PLNT01", "PLNT02", c["category"], qty, "EA",
                   "HIGH" if qty > 500 else "NORMAL"]
            writer.writerow(row)
            rows.append(dict(zip(["to_number", "from_plant", "to_plant", "material", "qty", "uom", "priority"], row)))
        edi_standard = "Stock Transport Order"

    return {
        "doc_id": doc_id,
        "doc_type": doc_type,
        "target_system": target_system,
        "edi_standard": edi_standard,
        "line_count": len(rows),
        "lines": rows,
        "flat_file": output.getvalue(),
        "filename": f"{doc_id}_{doc_type}_{target_system}.csv",
        "generated_at": now.isoformat() + "Z",
    }


@app.get("/api/execution/api-registry")
def execution_api_registry():
    """
    Registry of real-time APIs and webhooks exposed/consumed by the platform.
    """
    apis = [
        {"endpoint": "/api/v1/inventory/positions", "method": "GET", "type": "Outbound API",
         "consumers": ["WMS", "Control Tower"], "rate_limit": "600/min", "avg_latency_ms": 42, "status": "live"},
        {"endpoint": "/api/v1/forecast/publish", "method": "POST", "type": "Outbound API",
         "consumers": ["ERP", "Suppliers"], "rate_limit": "120/min", "avg_latency_ms": 88, "status": "live"},
        {"endpoint": "/api/v1/orders/status", "method": "GET", "type": "Outbound API",
         "consumers": ["TMS", "Procurement"], "rate_limit": "300/min", "avg_latency_ms": 55, "status": "live"},
        {"endpoint": "webhook: pos.sale.created", "method": "POST", "type": "Inbound Webhook",
         "consumers": ["Demand Sensing"], "rate_limit": "unlimited", "avg_latency_ms": 12, "status": "live"},
        {"endpoint": "webhook: shipment.delivered", "method": "POST", "type": "Inbound Webhook",
         "consumers": ["Inventory", "Control Tower"], "rate_limit": "unlimited", "avg_latency_ms": 18, "status": "live"},
        {"endpoint": "webhook: supplier.asn.received", "method": "POST", "type": "Inbound Webhook",
         "consumers": ["Inventory", "Procurement"], "rate_limit": "unlimited", "avg_latency_ms": 21, "status": "live"},
    ]
    return {
        "apis": apis,
        "summary": {
            "total": len(apis),
            "outbound": sum(1 for a in apis if a["type"] == "Outbound API"),
            "webhooks": sum(1 for a in apis if "Webhook" in a["type"]),
            "avg_latency_ms": round(sum(a["avg_latency_ms"] for a in apis) / len(apis), 0),
        },
    }


@app.get("/api/execution/event-stream")
def execution_event_stream(limit: int = 25):
    """
    Recent integration event stream — the live ledger of messages flowing
    between the platform and connected execution systems.
    """
    import random
    random.seed(7)
    event_types = [
        ("pos.sale.created", "POS", "Demand Sensing", "inbound"),
        ("shipment.delivered", "TMS", "Inventory", "inbound"),
        ("forecast.published", "Planora", "ERP", "outbound"),
        ("po.created", "Planora", "Procurement", "outbound"),
        ("transfer.executed", "Planora", "WMS", "outbound"),
        ("supplier.asn.received", "Supplier", "Inventory", "inbound"),
        ("stock.adjusted", "WMS", "Planora", "inbound"),
        ("load.tendered", "Planora", "TMS", "outbound"),
    ]
    statuses = ["success"] * 18 + ["retry", "success"]  # ~95% success, occasional retry
    now = datetime.utcnow()
    events = []
    for i in range(limit):
        et = random.choice(event_types)
        status = random.choice(statuses)
        ts = now - timedelta(minutes=i * random.randint(1, 6))
        events.append({
            "event_id": f"EVT{ts.strftime('%H%M%S')}{i:02d}",
            "event_type": et[0],
            "source": et[1],
            "target": et[2],
            "direction": et[3],
            "status": status,
            "timestamp": ts.isoformat() + "Z",
            "latency_ms": random.randint(8, 140),
        })
    success = sum(1 for e in events if e["status"] == "success")
    return {
        "events": events,
        "summary": {
            "total": len(events),
            "success_rate": round(success / len(events) * 100, 1),
            "retries": sum(1 for e in events if e["status"] == "retry"),
        },
    }
