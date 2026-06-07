# Planora AI: Enterprise Demand Planning & Forecasting Platform

Planora AI is an enterprise-grade, high-fidelity Demand Planning, S&OP (Sales & Operations Planning), and Inventory Optimization solution. Designed for modern supply chain planners, it combines advanced forecasting models (ARIMA, Holt-Winters, Random Forest, XGBoost, and LightGBM) with a premium, responsive, glassmorphic visual interface.

---

## 🚀 Key Modules & Capabilities

### 📈 1. Demand Planning
* **Multi-Model Support**: Statistical forecasting models (Moving Average, SES, Holt, Holt-Winters, ARIMA, SARIMAX, Croston) and Machine Learning models (Decision Trees, Random Forest, AdaBoost, XGBoost, LightGBM).
* **Consensus Forecast Editor**: Planners can manually apply percentage uplifts/downlifts to statistical baselines directly inside an interactive pivot grid, projecting final consensus volumes in real-time.
* **New Product Introduction (NPI)**: Simulate demand curves for new products with zero sales history by cloning and scaling profiles of similar existing SKUs.

### 📦 2. Inventory Optimization
* **Safety Stock Simulator**: Recalculate target safety stock buffer levels and capital expenditure requirements on-the-fly using custom service level constraints (80% to 99.9%).
* **Multi-Echelon Network Explorer**: Track on-hand vs. in-transit inventory, unit costs, daily demand averages, and Days of Supply (DoS) to identify excess stock and stockout risks.
* **Replenishment Workbench**: Auto-calculate Reorder Points (ROP) and Economic Order Quantities (EOQ) to draft Purchase Orders for items needing replenishment.

### 🩺 3. Supply Chain Diagnostics
* **HOTW (Hands-Off-the-Wheel) Tracking**: Monitor automated forecast automation metrics. Compare Machine Learning accuracy (System MAPE) against planner overrides (Human MAPE) to calculate Positive Value Add.
* **Entropy Scanner**: Analyze demand patterns to classify SKUs based on volume volatility (Coefficient of Variation) and demand frequency (Average Demand Interval).

### 🏢 4. S&OP / IBP (Integrated Business Planning)
* **Demand-Supply Capacity Balancing**: Run Rough-Cut Capacity Planning (RCCP) charts to visualize capacity limitations against unconstrained forecasts, triggering flex subcontractor capacities to capture seasonal peaks.
* **Financial Reconciliation**: Map constrained supply volumes to Projected Gross Margins, COGS, and revenue streams, tracking variances against the Annual Operational Plan (AOP).

### 💰 5. Scenario & Financial Simulation
* **P&L Stress Testing**: Simulate system-wide demand shocks, price elasticity impacts (ASP adjustments), and COGS sourcing shifts.
* **Product Mix Optimizer**: Algorithmic ranking of SKUs based on Gross Margin yield to prioritize production allocation during capacity bottlenecks.

---

## 🛠️ Technology Stack & Architecture

```
                       +------------------------+
                       |   Next.js Frontend     |
                       |  (React, Recharts,     |
                       |   Lucide icons, CSS)   |
                       +-----------+------------+
                                   |
                Upload files /     |  Generate forecasts (API)
                Run calculations   |  [In Progress]
                                   v
                       +------------------------+
                       |    FastAPI Backend     |
                       | (Python, Statsmodels,  |
                       |  scikit-learn, SQLA)   |
                       +-----------+------------+
                                   |
                                   v
                       +------------------------+
                       |  SQLite / PostgreSQL   |
                       |   (Demand DB Tables)   |
                       +------------------------+
```

### Frontend (`/DemandPlanningSaaS/frontend`)
* **Framework**: Next.js 15 (App Router, React, TypeScript).
* **Charts & Visualization**: Recharts (Composed charts, Area, Line, Scatter, and Bar charts).
* **Aesthetics**: Vanilla CSS variables supporting a premium dark/light mode transition, curated HSL color maps, smooth micro-animations, and frosted-glass panels.

### Backend (`/DemandPlanningSaaS/backend`)
* **Framework**: FastAPI (Python 3.9+).
* **Database**: SQLite (SQLAlchemy ORM) storing Canonical Demand records, Forecast results, and Audit Logs.
* **ML Engines**: `scikit-learn`, `statsmodels`, `xgboost`, `lightgbm`.

---

## 🏃 Local Setup & Running Instructions

To run the platform concurrently, you can use the included setup shell script or start the services separately.

### Prerequisites
* **Node.js**: v18.0 or higher
* **Python**: v3.9 or higher

### Method A: Quick Start (Shell Script)
Run the automated initialization script from the root project directory:
```bash
chmod +x DemandPlanningSaaS/run_platform.sh
./DemandPlanningSaaS/run_platform.sh
```
This script initializes the Python virtual environment, installs dependencies, handles node module compilation, and launches both Next.js and FastAPI dev servers.

---

### Method B: Manual Service Inception

#### 1. Spin up the FastAPI Backend
```bash
cd DemandPlanningSaaS/backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Start FastAPI server (runs on port 8000)
python3 main.py
```

#### 2. Spin up the Next.js Frontend
```bash
cd DemandPlanningSaaS/frontend

# Install dependencies
npm install

# Start Next.js dev server (runs on port 3000)
npm run dev
```

Open your browser to [http://localhost:3000](http://localhost:3000) to access the landing portal and planning workspaces.

---

## 📊 Canonical Ingestion Schema
When uploading demand data through the UI's **Upload** tool, your CSV/Excel file should map to the following canonical database structure:

| Field | Type | Description |
|---|---|---|
| `date` | DateTime | Timestamp representing the period of demand (Day, Week, Month) |
| `target_demand` | Float | Historical actual quantity sold |
| `sku` | String | Unique Stock Keeping Unit identifier |
| `category` | String | Product line classification (e.g., Electronics, Accessories) |
| `location` | String | Warehouse, distribution center, or store locator |
| `channel` | String | Sales channel (e.g., Online, Retail, Wholesale) |
| `exogenous_variables` | JSON | Optional external factors (e.g., price, temperature, promo flag) |

---

## 🗺️ Roadmap & Upcoming Features
* **Active API Integration**: Hook frontend parameter controllers and chart selections directly into the `/api/forecast` Python engine for live ML model backtesting and prediction intervals.
* **Live SCM LLM Copilot**: Integrate the Google Gemini API (via Firebase AI Logic) to replace keyword-matching with a smart, conversational assistant capable of analyzing data grids and recommending actions.
* **Multi-Scenario Comparison Sandboxes**: Create a dashboard view to save and compare multiple supply chain planning scenarios side-by-side.
* **Top-down/Bottom-up Consensus Editing**: Automatically allocate category-level manual forecast adjustments down to individual SKUs proportionally.
