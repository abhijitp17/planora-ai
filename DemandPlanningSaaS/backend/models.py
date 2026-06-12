from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from database import Base

class DemandRecord(Base):
    """
    Canonical Data Model for Demand Planning
    """
    __tablename__ = "demand_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, index=True, nullable=False)
    target_demand = Column(Float, nullable=False)
    sku = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    location = Column(String, index=True, nullable=False)
    channel = Column(String, index=True, nullable=False)
    
    # JSON column for dynamic configurable hierarchies & exogenous variables
    hierarchy_levels = Column(JSON, default={})
    exogenous_variables = Column(JSON, default={})
    
    planner_id = Column(String, index=True)
    dataset_version = Column(String, index=True, nullable=False)

class ForecastResult(Base):
    """
    Stores forecast outputs
    """
    __tablename__ = "forecast_results"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, index=True, nullable=False)
    forecast_demand = Column(Float, nullable=False)
    sku = Column(String, index=True, nullable=False)
    model_name = Column(String, index=True, nullable=False)
    ensemble_strategy = Column(String, index=True, nullable=True) # If this was ensemble
    horizon = Column(Integer, nullable=False)
    dataset_version = Column(String, index=True, nullable=False)

class AuditLog(Base):
    """
    Governance & Auditability
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    actionType = Column(String, nullable=False)
    dataset = Column(String, nullable=True)
    metadata_json = Column(JSON, default={})

# ═════════════════════════════════════════════════════════════════════════════
# Demand Sensing & Event-Based Models
# ═════════════════════════════════════════════════════════════════════════════

class DemandSensingSignal(Base):
    __tablename__ = "demand_sensing_signals"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    sku = Column(String, nullable=False, index=True)
    channel = Column(String, nullable=False)
    actual_sales = Column(Float, nullable=False)
    dataset_version = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    event_type = Column(String, nullable=False, index=True)  # holiday, promotion, launch, disruption
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=False)
    impact_pct = Column(Float, default=0.0)  # +25% for promo, -40% for disruption
    affected_categories_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# Workflow Approvals
class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(String, nullable=False, index=True)
    approval_type = Column(String, nullable=False, index=True)
    payload_json = Column(JSON)
    approver_role = Column(String, nullable=False)
    approver_id = Column(String)
    status = Column(String, default="PENDING", index=True)  # PENDING, APPROVED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime)
    comments = Column(String)

# Master Data Management
class SKUMaster(Base):
    __tablename__ = "sku_master"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    unit_cost = Column(Float, nullable=False)
    asp = Column(Float, nullable=False)  # Average selling price
    lead_time = Column(Integer, nullable=False)  # Days
    supplier = Column(String)
    status = Column(String, default="ACTIVE", index=True)  # ACTIVE, DISCONTINUED, PENDING
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
