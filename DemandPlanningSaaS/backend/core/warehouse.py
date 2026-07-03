import random

# Warehouse Capacity & Spatial Metadata
FACILITIES_CAPACITY = {
    "WH_EAST": {"total_pallets": 10000, "used_pallets": 9650, "overflow_trigger": 9000, "flex_lease_available": True},
    "WH_WEST": {"total_pallets": 8000, "used_pallets": 6720, "overflow_trigger": 7200, "flex_lease_available": True},
    "WH_SOUTH": {"total_pallets": 6000, "used_pallets": 4200, "overflow_trigger": 5400, "flex_lease_available": False},
    "WH_NORTH": {"total_pallets": 12000, "used_pallets": 5400, "overflow_trigger": 10800, "flex_lease_available": True}
}

def get_warehouse_capacity_plan():
    results = {}
    for facility_id, cap in FACILITIES_CAPACITY.items():
        util_pct = round((cap["used_pallets"] / cap["total_pallets"]) * 100, 1)
        status = "normal"
        if util_pct >= 95.0:
            status = "critical"
        elif util_pct >= 85.0:
            status = "warning"
            
        results[facility_id] = {
            "facility_id": facility_id,
            "total_capacity_pallets": cap["total_pallets"],
            "used_capacity_pallets": cap["used_pallets"],
            "utilization_pct": util_pct,
            "status": status,
            "overflow_risk": util_pct >= 90.0,
            "flex_lease_activated": util_pct >= 95.0 and cap["flex_lease_available"]
        }
    return results

def run_slotting_optimization(facility_id: str, skus_count: int = 100):
    """
    Run slotting optimizer on a facility.
    Generates slot zone coordinates and picking travel time improvements.
    """
    random.seed(42)
    
    # Generate list of mock SKUs with pick frequencies
    skus_list = []
    for i in range(skus_count):
        pick_freq = random.randint(2, 250)
        # Classify by velocity
        if pick_freq > 150:
            velocity = "A" # Fast-moving
            current_zone = "Zone C" # Bad slotting
            recommended_zone = "Zone A"
        elif pick_freq > 50:
            velocity = "B" # Medium-moving
            current_zone = "Zone A"
            recommended_zone = "Zone B"
        else:
            velocity = "C" # Slow-moving
            current_zone = "Zone B"
            recommended_zone = "Zone C"
            
        skus_list.append({
            "sku": f"ELE_PART_{i:03d}",
            "picks_per_day": pick_freq,
            "velocity": velocity,
            "current_bin": current_zone,
            "recommended_bin": recommended_zone
        })
        
    # Calculate travel distance changes
    # Zone A = 5m from dock, Zone B = 18m from dock, Zone C = 45m from dock
    distances = {"Zone A": 5, "Zone B": 18, "Zone C": 45}
    
    before_distance = sum(item["picks_per_day"] * distances[item["current_bin"]] for item in skus_list)
    after_distance = sum(item["picks_per_day"] * distances[item["recommended_bin"]] for item in skus_list)
    
    reduction_pct = round(((before_distance - after_distance) / before_distance) * 100, 1)
    
    return {
        "facility_id": facility_id,
        "processed_skus_count": skus_count,
        "before_travel_distance_meters": before_distance,
        "after_travel_distance_meters": after_distance,
        "distance_reduction_pct": reduction_pct,
        "travel_time_savings_minutes": round((before_distance - after_distance) * 0.05, 1), # 0.05 min per meter picking time
        "recommendations": skus_list[:15] # Return first 15 for UI preview
    }
