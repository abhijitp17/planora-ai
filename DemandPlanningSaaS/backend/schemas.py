from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict

class DemandRecordBase(BaseModel):
    date: datetime
    target_demand: float
    sku: str
    category: str
    location: str
    channel: str
    hierarchy_levels: Optional[Dict] = {}
    exogenous_variables: Optional[Dict] = {}
    planner_id: Optional[str] = None
    dataset_version: str

class DemandRecordCreate(DemandRecordBase):
    pass

class DemandRecordResponse(DemandRecordBase):
    id: int

    class Config:
        orm_mode = True

class FileUploadResponse(BaseModel):
    filename: str
    status: str
    records_processed: int
    dataset_version: str

from typing import List

class SafetyStockRequest(BaseModel):
    sku: str
    dataset_version: str
    service_level: Optional[float] = 0.95
    lead_time_std: Optional[float] = 0.0

class ServiceLevelOptimizeRequest(BaseModel):
    sku: str
    dataset_version: str
    unit_cost: float
    holding_cost_pct: Optional[float] = 0.20
    stockout_cost_multiplier: Optional[float] = 3.0

class RopRequest(BaseModel):
    sku: str
    dataset_version: str
    service_level: Optional[float] = 0.95

class ExecuteTransfersRequest(BaseModel):
    transfers: List[dict]
    output_format: Optional[str] = "SAP"

class CausalForecastRequest(BaseModel):
    dataset_version: str
    sku: str
    exog_variables: dict
    horizon: Optional[int] = 12
    model: Optional[str] = "arimax"

class ApprovalRequestCreate(BaseModel):
    requester_id: str
    approval_type: str
    payload: dict
    approver_role: Optional[str] = "manager"

class DatasetDiffRequest(BaseModel):
    version_a: str
    version_b: str

class ConnectorPingRequest(BaseModel):
    connector_id: str

class GovernanceSettingsUpdate(BaseModel):
    consensus_cap_pct: float
    service_level_floor_pct: float
    locked_skus: List[str]

class SlottingOptimizeRequest(BaseModel):
    facility_id: str
    skus_count: Optional[int] = 100

class SupplierCommitRequest(BaseModel):
    supplier_name: str
    sku: str
    dataset_version: str
    commit_qty: float
    notes: Optional[str] = ""

class AsnUploadRequest(BaseModel):
    supplier_name: str
    asn_number: str
    items: List[dict]

class ConnectorSyncRequest(BaseModel):
    connector_id: str
    force_full_sync: Optional[bool] = False




