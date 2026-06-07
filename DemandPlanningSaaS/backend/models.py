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
