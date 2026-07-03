import datetime

# Mock shared forecast targets from planners to suppliers
SHARED_FORECASTS = [
    {"supplier_name": "Asia Sourcing Corp", "sku": "ELE_PHONE_001", "month": "2026-07", "requested_qty": 1200.0, "committed_qty": 1200.0, "status": "Fully Committed"},
    {"supplier_name": "Asia Sourcing Corp", "sku": "ELE_PHONE_001", "month": "2026-08", "requested_qty": 1500.0, "committed_qty": 1100.0, "status": "Under Committed"},
    {"supplier_name": "Samsung Display", "sku": "ELE_TV_85_OLED", "month": "2026-07", "requested_qty": 300.0, "committed_qty": 300.0, "status": "Fully Committed"},
    {"supplier_name": "Samsung Display", "sku": "ELE_TV_85_OLED", "month": "2026-08", "requested_qty": 350.0, "committed_qty": 200.0, "status": "Under Committed"},
    {"supplier_name": "ErgoFlex Mfg", "sku": "FUR_CHAIR_ERG", "month": "2026-07", "requested_qty": 500.0, "committed_qty": 500.0, "status": "Fully Committed"},
    {"supplier_name": "ErgoFlex Mfg", "sku": "FUR_CHAIR_ERG", "month": "2026-08", "requested_qty": 600.0, "committed_qty": 600.0, "status": "Fully Committed"},
    {"supplier_name": "Logitech", "sku": "ACC_MOUSE_WIRELESS", "month": "2026-07", "requested_qty": 2500.0, "committed_qty": 2200.0, "status": "Under Committed"}
]

# Historical ASN list
ASN_LEDGER = [
    {
        "asn_number": "ASN-90210-99",
        "supplier_name": "Asia Sourcing Corp",
        "ship_date": "2026-07-02T10:00:00Z",
        "estimated_arrival": "2026-07-16T18:00:00Z",
        "status": "In Transit",
        "items": [{"sku": "ELE_PHONE_001", "qty": 800}]
    },
    {
        "asn_number": "ASN-88271-11",
        "supplier_name": "Logitech",
        "ship_date": "2026-06-28T14:30:00Z",
        "estimated_arrival": "2026-07-04T09:00:00Z",
        "status": "Near Facility",
        "items": [{"sku": "ACC_MOUSE_WIRELESS", "qty": 1500}]
    }
]

def get_shared_forecasts(supplier_name: str = None):
    if supplier_name:
        return [f for f in SHARED_FORECASTS if f["supplier_name"].lower() == supplier_name.lower()]
    return SHARED_FORECASTS

def save_supplier_commit(supplier_name: str, sku: str, month: str, commit_qty: float, notes: str = ""):
    # Find matching share forecast item
    for f in SHARED_FORECASTS:
        if f["supplier_name"].lower() == supplier_name.lower() and f["sku"] == sku and f["month"] == month:
            f["committed_qty"] = commit_qty
            if commit_qty >= f["requested_qty"]:
                f["status"] = "Fully Committed"
            else:
                f["status"] = "Under Committed"
            return {"status": "success", "updated_forecast": f}
            
    # If no pre-existing target match, insert it
    new_f = {
        "supplier_name": supplier_name,
        "sku": sku,
        "month": month,
        "requested_qty": commit_qty,
        "committed_qty": commit_qty,
        "status": "Fully Committed",
        "notes": notes
    }
    SHARED_FORECASTS.append(new_f)
    return {"status": "success", "updated_forecast": new_f}

def upload_supplier_asn(supplier_name: str, asn_number: str, items: list):
    new_asn = {
        "asn_number": asn_number,
        "supplier_name": supplier_name,
        "ship_date": datetime.datetime.utcnow().isoformat() + "Z",
        "estimated_arrival": (datetime.datetime.utcnow() + datetime.timedelta(days=14)).isoformat() + "Z",
        "status": "Shipped",
        "items": items
    }
    ASN_LEDGER.insert(0, new_asn)
    return {"status": "success", "asn": new_asn}

def get_asn_ledger(supplier_name: str = None):
    if supplier_name:
        return [a for a in ASN_LEDGER if a["supplier_name"].lower() == supplier_name.lower()]
    return ASN_LEDGER
