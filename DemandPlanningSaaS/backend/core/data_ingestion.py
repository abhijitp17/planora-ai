import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional
import uuid

def process_upload_to_canonical(
    df: pd.DataFrame, 
    mapping: Optional[Dict[str, str]] = None, 
    planner_id: str = "system"
) -> List[Dict]:
    """
    Converts an uploaded CSV/Excel DataFrame into Canonical Demand Records.
    
    mapping example:
    {
        "InvoiceDate": "date",
        "SalesQty": "target_demand",
        "ProductID": "sku",
        "ProductCategory": "category",
        "Store": "location",
        "SalesChannel": "channel"
    }
    """
    if mapping:
        df = df.rename(columns=mapping)
    
    # Required columns in Canonical Data Model
    required_cols = ["date", "target_demand", "sku", "category", "location", "channel"]
    
    # Infer if missing (very basic inference)
    for col in required_cols:
        if col not in df.columns:
            # fill with defaults if not present
            if col == "target_demand":
                df[col] = 0.0
            elif col == "date":
                df[col] = datetime.now()
            else:
                df[col] = "UNKNOWN"

    # Ensure format
    df["date"] = pd.to_datetime(df["date"], errors="coerce").fillna(datetime.now())
    df["target_demand"] = pd.to_numeric(df["target_demand"], errors="coerce").fillna(0.0)
    
    # Optional Hierarchy and Exogenous variables
    exogenous_cols = [c for c in df.columns if c not in required_cols]
    
    dataset_version = f"v_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    records = []
    for _, row in df.iterrows():
        exo_vars = {c: row[c] for c in exogenous_cols if pd.notna(row[c])}
        record = {
            "date": row["date"],
            "target_demand": row["target_demand"],
            "sku": str(row["sku"]),
            "category": str(row["category"]),
            "location": str(row["location"]),
            "channel": str(row["channel"]),
            "hierarchy_levels": {}, 
            "exogenous_variables": exo_vars,
            "planner_id": planner_id,
            "dataset_version": dataset_version
        }
        records.append(record)
        
    return records, dataset_version
