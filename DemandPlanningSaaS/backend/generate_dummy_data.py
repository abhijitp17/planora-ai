import csv
import random
from datetime import datetime, timedelta
import math

# Seed for reproducibility
random.seed(42)

# Define portfolios / categories and their prefixes/products
portfolios = {
    "Electronics": {
        "prefix": "ELE",
        "items": ["TV", "Phone", "Laptop", "Tablet", "Monitor", "Headphones", "Speaker", "Camera", "Charger", "Keyboard"],
        "min_demand": 50, "max_demand": 1000
    },
    "FMCG": {
        "prefix": "FMCG",
        "items": ["Soda", "Yogurt", "Cereal", "Soap", "Shampoo", "Snacks", "Water", "Coffee", "Tea", "Milk"],
        "min_demand": 500, "max_demand": 10000
    },
    "Apparel": {
        "prefix": "APP",
        "items": ["Tee", "Jacket", "Jeans", "Socks", "Sweater", "Hoodie", "Shorts", "Sneakers", "Cap", "Gloves"],
        "min_demand": 100, "max_demand": 2000
    },
    "Pharmaceuticals": {
        "prefix": "PHARM",
        "items": ["Insulin", "Ibuprofen", "Aspirin", "Vitamins", "Bandages", "CoughSyrup", "AllergyPill", "Antibiotic", "Masks", "Antiseptic"],
        "min_demand": 200, "max_demand": 4000
    },
    "Automotive": {
        "prefix": "AUT",
        "items": ["Tire", "Battery", "OilFilter", "WiperBlade", "SparkPlug", "BrakePad", "Alternator", "Headlight", "Coolant", "AirFilter"],
        "min_demand": 20, "max_demand": 500
    },
    "HomeGoods": {
        "prefix": "HOM",
        "items": ["Pillow", "Sheets", "Lamp", "Chair", "Rug", "Towel", "Mirror", "Clock", "Curtain", "Desk"],
        "min_demand": 30, "max_demand": 800
    },
    "Beauty": {
        "prefix": "BEA",
        "items": ["Lipstick", "Foundation", "Mascara", "Perfume", "Lotion", "FaceWash", "Sunscreen", "NailPolish", "EyeShadow", "Blush"],
        "min_demand": 150, "max_demand": 3000
    }
}

locations = ["WH_EAST_01", "WH_WEST_02", "WH_SOUTH_03", "WH_NORTH_04"]
channels = ["B2B_DISTRIBUTOR", "RETAIL", "E_COMMERCE", "WHOLESALE"]

# Generate 500 unique SKUs
skus = []
sku_details = {}

categories = list(portfolios.keys())
skus_per_category = 500 // len(categories)
remaining_skus = 500 % len(categories)

sku_id_counter = 1
for idx, cat in enumerate(categories):
    details = portfolios[cat]
    count = skus_per_category + (1 if idx < remaining_skus else 0)
    
    for i in range(1, count + 1):
        item_type = random.choice(details["items"])
        sku_code = f"{details['prefix']}_{item_type.upper()}_{i:03d}"
        skus.append(sku_code)
        
        # Assign attributes for realistic generation
        base = random.randint(details["min_demand"], details["max_demand"])
        trend = random.uniform(-0.05, 0.05)  # slight growth/decline trend
        season_phase = random.uniform(0, 2 * math.pi)  # random starting phase for seasonality
        volatility = random.uniform(0.1, 0.3)  # coeff of variation (noise size)
        loc = random.choice(locations)
        chan = random.choice(channels)
        
        sku_details[sku_code] = {
            "category": cat,
            "base": base,
            "trend": trend,
            "season_phase": season_phase,
            "volatility": volatility,
            "location": loc,
            "channel": chan
        }

# Generate time series data (March 1, 2026 to May 31, 2026 - 92 days)
start_date = datetime(2026, 3, 1)
end_date = datetime(2026, 5, 31)
date_list = [start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1)]

output_file = "sample_master_data_500_skus.csv"

print(f"Generating {len(skus)} SKUs across {len(date_list)} days (~{len(skus) * len(date_list)} rows)...")

with open(output_file, mode="w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(["date", "target_demand", "sku", "category", "location", "channel"])
    
    row_count = 0
    for date in date_list:
        date_str = date.strftime("%Y-%m-%d")
        day_of_week = date.weekday()
        day_index = (date - start_date).days
        
        for sku in skus:
            details = sku_details[sku]
            
            # 1. Base Demand
            base = details["base"]
            
            # 2. Trend Component
            trend_factor = 1 + (details["trend"] * (day_index / 90))
            
            # 3. Weekly Seasonality (soda/FMCG spikes on weekends, etc.)
            # Weekday factor: weekends (Friday=4, Saturday=5, Sunday=6) have higher demand
            if details["category"] in ["FMCG", "Beauty", "Apparel"]:
                weekday_factor = 1.25 if day_of_week >= 4 else 0.85
            else:
                weekday_factor = 0.90 if day_of_week >= 5 else 1.05
                
            # 4. Sine-based cyclicality
            cycle_factor = 1 + 0.15 * math.sin((day_index / 30) * 2 * math.pi + details["season_phase"])
            
            # Combined baseline
            baseline = base * trend_factor * weekday_factor * cycle_factor
            
            # 5. Volatility (noise)
            noise_sd = baseline * details["volatility"]
            demand = max(0, int(random.gauss(baseline, noise_sd)))
            
            # 6. Random promotional spikes (2% chance for a massive spike)
            if random.random() < 0.02:
                demand = int(demand * random.uniform(1.8, 3.0))
                
            writer.writerow([
                date_str,
                demand,
                sku,
                details["category"],
                details["location"],
                details["channel"]
            ])
            row_count += 1

print(f"Data generation complete! {row_count} rows written to {output_file}.")
