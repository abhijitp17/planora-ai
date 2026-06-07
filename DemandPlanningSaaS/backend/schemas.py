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
