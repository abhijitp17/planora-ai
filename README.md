# Planora AI: Enterprise Demand Planning & Forecasting Platform

Planora AI is an enterprise-grade, high-fidelity Demand Planning, S&OP (Sales & Operations Planning), and Inventory Optimization solution. Designed for modern supply chain planners, it combines advanced forecasting models (ARIMA, Holt-Winters, Random Forest, XGBoost, and LightGBM) with a premium, responsive, desaturated Bloomberg-style cockpit visual interface.

---

## 🚀 Key Modules & Capabilities

### 📈 1. Demand Planning
* **Multi-Model Support**: Statistical forecasting models (Moving Average, SES, Holt, Holt-Winters, ARIMA, SARIMAX, Croston) and Machine Learning models (Decision Trees, Random Forest, AdaBoost, XGBoost, LightGBM).
* **Consensus Forecast Editor**: Planners can manually apply percentage, absolute, set-value, or linear uplifts/downlifts directly inside an interactive pivot grid, projecting final consensus volumes in real-time.
* **New Product Introduction (NPI)**: Simulate demand curves for new products with zero sales history by cloning and scaling profiles of similar existing SKUs.
* **Data Explorer**: Comprehensive, server-paginated data grid displaying raw data uploads with full sorting, filtering, and live search.

### 📦 2. Inventory Optimization
* **Safety Stock Simulator**: Recalculate target safety stock buffer levels and capital expenditure requirements on-the-fly using custom service level constraints (80% to 99.9%).
* **Multi-Echelon Network Explorer**: Track on-hand vs. in-transit inventory, unit costs, daily demand averages, and Days of Supply (DoS) to identify excess stock and stockout risks.
* **Replenishment Workbench**: Auto-calculate Reorder Points (ROP) and Economic Order Quantities (EOQ) to draft Purchase Orders for items needing replenishment.
* **Inventory Segmentation (ABC/XYZ)**: Multi-dimensional portfolio classification based on revenue yield and demand volatility with interactive heatmaps.

### 🩺 3. Supply Chain Diagnostics & Analytics
* **FVA (Forecast Value Added) Tracking**: Monitor automated forecast automation metrics. Compare Machine Learning accuracy (System MAPE) against planner overrides (Human MAPE) to calculate Positive Value Add (Positive/Negative FVA).
* **Entropy Scanner**: Analyze demand patterns to classify SKUs based on volume volatility (Coefficient of Variation) and demand frequency (Average Demand Interval).
* **Anomaly Detection**: Automated data quality scanner utilizing Isolation Forest ML models to flag outliers in history.

### 🏢 4. S&OP / IBP (Integrated Business Planning)
* **Demand-Supply Capacity Balancing**: Run Rough-Cut Capacity Planning (RCCP) charts to visualize capacity limitations against unconstrained forecasts, triggering flex subcontractor capacities to capture seasonal peaks.
* **Financial Reconciliation**: Map constrained supply volumes to Projected Gross Margins, COGS, and revenue streams, tracking variances against the Annual Operational Plan (AOP).
* **Scenario Comparison & Sandboxes**: Compare Conservative, Base Case, Aggressive, and Disruption scenarios side-by-side.

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
                 Upload files /     |  Generate forecasts /
                 Run calculations   |  Interactive queries
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
* **Aesthetics**: Vanilla CSS variables supporting a premium industrial theme, curated HSL color maps, smooth micro-animations, and sharp layout boundaries (no rounded corners).

### Backend (`/DemandPlanningSaaS/backend`)
* **Framework**: FastAPI (Python 3.9+).
* **Database**: SQLite (SQLAlchemy ORM) storing Canonical Demand records, Forecast results, and Audit Logs.
* **ML Engines**: `scikit-learn`, `statsmodels`, `xgboost`, `lightgbm` compiled libraries.

---

## 📊 Planora AI Capability Matrix

Planora AI contains robust capabilities across 16 core supply chain planning modules. Below is the detailed breakdown of the platform's current status and codebase references.

### 1. Planning & Forecasting

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Statistical Forecasting** | **Strong** (11 statistical models: SMA, SES, Holt, Holt-Winters, ARIMA, SARIMA, Croston, SBA, TSB) | [forecasting.py](DemandPlanningSaaS/backend/core/forecasting.py) |
| **AI Forecasting** | **Strong** (ML models: Decision Trees, Random Forest, AdaBoost, XGBoost, LightGBM, AutoML) | [automl.py](DemandPlanningSaaS/backend/core/automl.py) |
| **Forecast Overrides** | **Strong** (Editable pivot grid with visual delta coloring and audit logging) | [demand/index.tsx](DemandPlanningSaaS/frontend/src/modules/demand/index.tsx) |
| **Forecast Accuracy Tracking** | **Strong** (Live backtesting engine calculates MAE, RMSE, and MAPE per model) | [main.py:L71](DemandPlanningSaaS/backend/main.py#L71) |
| **Demand Sensing** | **Strong** (Real-time POS signal ingestion database model & signal query logic) | [models.py:L59](DemandPlanningSaaS/backend/models.py#L59) • [/api/demand-sensing/ingest](DemandPlanningSaaS/backend/main.py#L379) |
| **Causal Forecasting** | **Strong** (ARIMAX forecasting support with exogenous variable matrices) | [main.py:L441](DemandPlanningSaaS/backend/main.py#L441) |
| **Event-Based Forecasting** | **Strong** (Calendar events integration: holidays, launches, disruptions) | [models.py:L71](DemandPlanningSaaS/backend/models.py#L71) • [/api/forecast/event-based](DemandPlanningSaaS/backend/main.py#L566) |
| **Promotion Forecasting** | **Strong** (Promotion calendar events with forward-buying cannibalization calculations) | [/api/pricing/promo-roi](DemandPlanningSaaS/backend/main.py#L3156) |
| **New Product Forecasting** | **Strong** (New Product Introduction profile cloning and volume scaling workbench) | [demand/index.tsx](DemandPlanningSaaS/frontend/src/modules/demand/index.tsx) |
| **Consensus Planning** | **Strong** (Bulk editor with 4 adjustment modes: percentage, absolute, set-value, and linear allocation) | `ConsensusBulkActions.tsx` • [main.py:L1595](DemandPlanningSaaS/backend/main.py#L1595) |
| **Forecast Explainability** | **Strong** (Integrated AI Copilot that inspects model MAPE and explains forecast variations) | [main.py:L845](DemandPlanningSaaS/backend/main.py#L845) • [CopilotPanel.tsx](DemandPlanningSaaS/frontend/src/components/ui/CopilotPanel.tsx) |

---

### 2. Inventory Optimization

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Safety Stock** | **Strong** (Calculated safety stock with demand and lead-time variance adjustments) | [/api/inventory/safety-stock/dynamic](DemandPlanningSaaS/backend/main.py#L1647) |
| **Reorder Point** | **Strong** (Workbench calculating dynamic ROP and EOQ with auto-reorder triggers) | [/api/inventory/rop/dynamic](DemandPlanningSaaS/backend/main.py#L1997) |
| **Inventory Visibility** | **Strong** (Multi-echelon network grid detailing on-hand, in-transit, cost, and stockout warnings) | [inventory/index.tsx](DemandPlanningSaaS/frontend/src/modules/inventory/index.tsx) |
| **Stockout Analysis** | **Strong** (At-risk stockout calculations, lost sales estimates, and stockout count KPIs) | [main.py:L1906](DemandPlanningSaaS/backend/main.py#L1906) |
| **Multi-Echelon Optimization** | **Strong** (Safety stock propagation and allocation across supplier/DC/retail network nodes) | [/api/inventory/multi-echelon](DemandPlanningSaaS/backend/main.py#L629) |
| **Service Level Optimization** | **Strong** (Cost-based service level optimizer maximizing margin vs. holding costs) | [/api/inventory/service-level/optimize](DemandPlanningSaaS/backend/main.py#L1693) |
| **Network Inventory Balancing** | **Strong** (Inventory transfer recommendations, including exporting WMS-compliant transfer CSVs) | [/api/inventory/network-balance](DemandPlanningSaaS/backend/main.py#L786) • [/api/inventory/network-transfers/execute](DemandPlanningSaaS/backend/main.py#L1864) |
| **Inventory Segmentation (ABC/XYZ)** | **Strong** (9-box portfolio classification based on revenue and volatility, with interactive heatmap) | [/api/inventory/abc-xyz](DemandPlanningSaaS/backend/main.py#L684) |
| **Working Capital Optimization** | **Strong** (Carrying cost calculators, trapped capital charts, and DIO/DSO/DPO tracking) | [/api/finance/working-capital](DemandPlanningSaaS/backend/main.py#L2729) |

---

### 3. S&OP / IBP

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Demand vs Supply Balancing** | **Strong** (Rough-Cut Capacity Planning balance chart mapping demand vs. capacity limits) | [sop/index.tsx](DemandPlanningSaaS/frontend/src/modules/sop/index.tsx) |
| **Revenue Impact Analysis** | **Strong** (AOP vs. unconstrained/constrained forecast variance tracking and margins) | [/api/sop/reconcile-plans](DemandPlanningSaaS/backend/main.py#L2332) |
| **Capacity Constraints** | **Strong** (Interactive toggles for air freight expedite and subcontractor flex capacity) | [/api/sop/reconcile-plans](DemandPlanningSaaS/backend/main.py#L2332) |
| **Executive Review Support** | **Strong** (Executive dashboard summarizing AOP targets, LE revenue, and margin gaps) | [sop/index.tsx](DemandPlanningSaaS/frontend/src/modules/sop/index.tsx) |
| **Integrated Business Planning** | **Strong** (Structured 5-step monthly cycle tracking: Portfolio → Demand → Supply → Finance → Exec Review) | [/api/sop/ibp-cycle-status](DemandPlanningSaaS/backend/main.py#L2274) |
| **Scenario-Based S&OP** | **Strong** (Comparison of Conservative, Base Case, Aggressive, and Disruption scenarios) | [/api/sop/scenario-compare](DemandPlanningSaaS/backend/main.py#L2444) |
| **Strategic Planning Horizon** | **Strong** (Multi-year, rolling 36-month strategic view mapping CAPEX triggers and growth targets) | [/api/sop/strategic-horizon](DemandPlanningSaaS/backend/main.py#L2484) |

---

### 4. Financial Planning

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Revenue Forecasting** | **Strong** (Calculated in budgeting, P&L modeling, and scenario runs) | [finance/index.tsx](DemandPlanningSaaS/frontend/src/modules/finance/index.tsx) |
| **Margin Analysis** | **Strong** (Gross margin ($) and percentage calculations at category and SKU levels) | [/api/finance/profitability](DemandPlanningSaaS/backend/main.py#L2685) |
| **COGS Analysis** | **Strong** (Budgets and profitability waterfall breakdowns) | [/api/finance/profitability](DemandPlanningSaaS/backend/main.py#L2685) |
| **Financial Projections** | **Strong** (Variance comparison sheets comparing operational forecasts vs. annual operating plans) | [/api/finance/budget](DemandPlanningSaaS/backend/main.py#L2639) |
| **Cash Flow Forecasting** | **Strong** (Direct-method cash flow projections utilizing DSO and DPO collection lags) | [/api/finance/cash-flow](DemandPlanningSaaS/backend/main.py#L2576) |
| **Budget Planning** | **Strong** (Annual Operating Plan generation with targeted category growth metrics) | [/api/finance/budget](DemandPlanningSaaS/backend/main.py#L2639) |
| **Profitability Modeling** | **Strong** (Category-level profitability tier classification: Star, Core, Drag) | [/api/finance/profitability](DemandPlanningSaaS/backend/main.py#L2685) |
| **Working Capital Planning** | **Strong** (Full Cash Conversion Cycle: DIO + DSO - DPO mapping net working capital) | [/api/finance/working-capital](DemandPlanningSaaS/backend/main.py#L2729) |

---

### 5. Scenario Planning & Digital Twin

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **What-if Analysis** | **Strong** (5 interactive sliders modeling demand, price, COGS, promo, and capacity adjustments) | [finance/index.tsx](DemandPlanningSaaS/frontend/src/modules/finance/index.tsx) |
| **Scenario Library** | **Strong** (Multi-scenario comparisons and simulation templates) | [/api/twin/scenario-comparison](DemandPlanningSaaS/backend/main.py#L1203) |
| **Scenario Comparison** | **Strong** (Simulates multi-scenario outcomes side-by-side) | [/api/twin/scenario-comparison](DemandPlanningSaaS/backend/main.py#L1203) |
| **Financial Impact Simulation** | **Strong** (Simulates real-time EBITDA, Revenue, Cost, and Margin variances) | [/api/twin/simulate-scenario](DemandPlanningSaaS/backend/main.py#L1112) |
| **Supply Chain Simulation** | **Strong** (Demand shock propagation and Monte Carlo risk simulations) | [twin/index.tsx](DemandPlanningSaaS/frontend/src/modules/twin/index.tsx) |
| **Demand Shock Simulation** | **Strong** (Bullwhip effect simulation tracking weekly order volatility, recovery speed, and stockouts) | [/api/twin/demand-shock](DemandPlanningSaaS/backend/main.py#L2783) |
| **Digital Twin Visualization** | **Strong** (Interactive network layout utilizing React Flow to map factories, DCs, and stores) | [twin/index.tsx](DemandPlanningSaaS/frontend/src/modules/twin/index.tsx) |
| **Risk Modeling** | **Strong** (Monte Carlo simulation running 1000 iterations to predict service and stockout probabilities) | [/api/twin/monte-carlo](DemandPlanningSaaS/backend/main.py#L2876) |

---

### 6. AI & Decision Intelligence

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **AI Diagnostics** | **Strong** (Forecast Value Added (FVA) metrics and Coefficient of Variation (CV) demand entropy quadrants) | [diagnostics/index.tsx](DemandPlanningSaaS/frontend/src/modules/diagnostics/index.tsx) |
| **Exception Detection** | **Strong** (Anomaly detection engine utilizing Isolation Forest models) | [/api/analytics/anomaly-detection](DemandPlanningSaaS/backend/main.py#L1940) |
| **Root Cause Analysis** | **Strong** (AI Copilot evaluates MAPE, lead times, and capacity to report root causes) | [CopilotPanel.tsx](DemandPlanningSaaS/frontend/src/components/ui/CopilotPanel.tsx) |
| **AI Recommendations** | **Strong** (Prescriptive AI actions generated with priority status and execution choices) | [/api/ai/prescriptive-actions](DemandPlanningSaaS/backend/main.py#L845) |
| **AI Copilot** | **Strong** (Provider-agnostic streaming assistant supporting 9 models with context injection) | `aiProviders.ts` • [CopilotPanel.tsx](DemandPlanningSaaS/frontend/src/components/ui/CopilotPanel.tsx) |
| **Conversational Analytics** | **Strong** (Copilot reads live dashboard metrics, SKU lists, and KPIs) | `contextualPrompts.ts` • [CopilotPanel.tsx](DemandPlanningSaaS/frontend/src/components/ui/CopilotPanel.tsx) |
| **Automated Insights** | **Strong** (Interactive "Planora AI Insights" panel in Global Analytics suggesting specific actions) | [analytics/index.tsx](DemandPlanningSaaS/frontend/src/modules/analytics/index.tsx) |
| **Prescriptive Decisioning** | **Strong** (Action recommendations linked directly to system triggers) | [/api/ai/prescriptive-actions](DemandPlanningSaaS/backend/main.py#L845) |
| **Autonomous Planning** | **Strong** (Autopilot system toggle configuring specific SKUs for unattended updates) | [/api/ai/autonomous-planning/enable](DemandPlanningSaaS/backend/main.py#L913) |

---

### 7. Category Management

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Category Scorecards** | **Strong** (Classifies categories by role: Destination, Routine, Convenience, Seasonal) | [/api/category/roles](DemandPlanningSaaS/backend/main.py#L2970) |
| **Category Profitability** | **Strong** (P&L waterfalls aggregated at the category level) | [/api/finance/profitability](DemandPlanningSaaS/backend/main.py#L2685) |
| **SKU Rationalization** | **Strong** (Margin optimization ranks high vs. low-yield SKUs to suggest catalog cleanups) | [finance/index.tsx](DemandPlanningSaaS/frontend/src/modules/finance/index.tsx) |
| **Long Tail Analysis** | **Strong** (Identified in ABC/XYZ segment matrices to flag highly volatile, slow-moving items) | [/api/inventory/abc-xyz](DemandPlanningSaaS/backend/main.py#L684) |
| **Assortment Optimization** | **Strong** (Keep/Drop/Add assortment solver in Retail Planning module) | [/api/retail/assortment-analysis](DemandPlanningSaaS/backend/main.py#L1439) |
| **Category Forecasting** | **Strong** (Aggregated category volume forecasting and historical charts) | [demand/index.tsx](DemandPlanningSaaS/frontend/src/modules/demand/index.tsx) |
| **Product Lifecycle Analysis** | **Strong** (Product review cadence and new product cloning templates) | [/api/sop/ibp-cycle-status](DemandPlanningSaaS/backend/main.py#L2274) |
| **Cannibalization Analysis** | **Strong** (Promotion ROI engine subtracts cannibalized future sales) | [/api/pricing/promo-roi](DemandPlanningSaaS/backend/main.py#L3156) |
| **Space Optimization** | **Strong** (Planogram layout solver utilizing SciPy linear programming) | [/api/retail/space-optimization](DemandPlanningSaaS/backend/main.py#L1232) |

---

### 8. Pricing & Promotion Optimization

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Price Simulation** | **Strong** (Volume response projection utilizing demand elasticity curves) | [/api/pricing/simulate](DemandPlanningSaaS/backend/main.py#L3097) |
| **Promotion Planning** | **Strong** (Promo calendar mapping and event forecasting) | [/api/events/create](DemandPlanningSaaS/backend/main.py#L507) |
| **Promotion ROI** | **Strong** (Calculates net promo ROI, discount costs, and incremental margin) | [/api/pricing/promo-roi](DemandPlanningSaaS/backend/main.py#L3156) |
| **Markdown Optimization** | **Strong** (Dynamic markdown alerts for excess stock and retail clearance optimizations) | [/api/pricing/dynamic](DemandPlanningSaaS/backend/main.py#L3226) • [/api/retail/markdown-optimization](DemandPlanningSaaS/backend/main.py#L1347) |
| **Elasticity Modeling** | **Strong** (Estimation of price elasticity curves to locate profit-maximizing price points) | [/api/pricing/elasticity](DemandPlanningSaaS/backend/main.py#L3050) |
| **Dynamic Pricing Recs** | **Strong** (Markup/markdown signals based on inventory cover and margin ceilings) | [/api/pricing/dynamic](DemandPlanningSaaS/backend/main.py#L3226) |
| **Margin Impact Analysis** | **Strong** (Simulated across pricing simulation and promotion ROI engines) | [/api/pricing/simulate](DemandPlanningSaaS/backend/main.py#L3097) |

---

### 9. Supplier Collaboration

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Supplier Scorecards** | **Strong** (KPI tab with average lead time, lead time volatility, inbound OTIF %, and computed supply risk) | [analytics/index.tsx](DemandPlanningSaaS/frontend/src/modules/analytics/index.tsx) |
| **OTIF Tracking** | **Strong** (Tracked in Service & Fulfillment dashboard and supplier scorecard sections) | [analytics/index.tsx](DemandPlanningSaaS/frontend/src/modules/analytics/index.tsx) |
| **Lead Time Monitoring** | **Strong** (Average lead time and lead time volatility tracked per supplier) | [analytics/index.tsx](DemandPlanningSaaS/frontend/src/modules/analytics/index.tsx) |
| **Forecast Sharing** | **Strong** (Exposed webhook: `webhook: forecast.published`) | [/api/execution/api-registry](DemandPlanningSaaS/backend/main.py#L3393) |
| **Shipment Visibility** | **Strong** (Exposed webhook: `webhook: shipment.delivered`) | [/api/execution/api-registry](DemandPlanningSaaS/backend/main.py#L3393) |
| **Supplier Risk Scoring** | **Strong** (Risk levels: High, Medium, Low calculated based on lead time volatility and OTIF gaps) | [analytics/index.tsx](DemandPlanningSaaS/frontend/src/modules/analytics/index.tsx) |
| **Collaborative Planning** | **Partial** (Simulated through exposed inbound/outbound webhooks and API channels) | [/api/execution/api-registry](DemandPlanningSaaS/backend/main.py#L3393) |
| **Supplier Portal** | **Missing / Simulated** (Supplier communication is currently simulated via webhooks/API event streams) | [/api/execution/event-stream](DemandPlanningSaaS/backend/main.py#L3424) |

---

### 10. Workforce Planning

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Workforce Scenarios** | **Partial / Minimal** (Headcount index metrics calculated in S&OP strategic horizon) | [/api/sop/strategic-horizon](DemandPlanningSaaS/backend/main.py#L2484) |
| **Staffing Forecasting** | **Missing** (Headcount index matches overall revenue volume scaling, no dedicated staffing model) | *N/A* |
| **Shift Planning** | **Missing** | *N/A* |
| **Labor Cost Forecasting** | **Missing** | *N/A* |
| **Productivity Modeling** | **Missing** | *N/A* |
| **Overtime Forecasting** | **Missing** | *N/A* |
| **Workforce Capacity Plan** | **Missing** | *N/A* |

---

### 11. Retail & Assortment Planning

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Store Clustering** | **Strong** (K-means store clustering algorithm assigning stores to volume/margin categories) | [/api/retail/store-clustering](DemandPlanningSaaS/backend/main.py#L1286) |
| **Localized Assortment** | **Strong** (Assortment recommendations solver recommending items to Keep/Drop/Add per cluster) | [/api/retail/assortment-analysis](DemandPlanningSaaS/backend/main.py#L1439) |
| **Shelf Space Optimization** | **Strong** (Planogram space optimization utilizing SciPy linear programming solver) | [/api/retail/space-optimization](DemandPlanningSaaS/backend/main.py#L1232) |
| **Assortment Planning** | **Strong** (Assortment analysis workbenches in UI modules) | [retail/index.tsx](DemandPlanningSaaS/frontend/src/modules/retail/index.tsx) |
| **Store-Level Forecasting** | **Strong** (Localized store cluster volume predictions) | [retail/index.tsx](DemandPlanningSaaS/frontend/src/modules/retail/index.tsx) |
| **Retail Performance Analytics** | **Strong** (Category-level revenue and margins aggregated over store databases) | [retail/index.tsx](DemandPlanningSaaS/frontend/src/modules/retail/index.tsx) |

---

### 12. Warehouse Intelligence

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Replenishment Opt.** | **Strong** (Safety Stock, dynamic ROP, and EOQ calculations mapped to auto-reorder actions) | [/api/inventory/rop/dynamic](DemandPlanningSaaS/backend/main.py#L1997) • [inventory/index.tsx](DemandPlanningSaaS/frontend/src/modules/inventory/index.tsx) |
| **Warehouse Capacity Plan** | **Partial** (Simulated capacity limitations in WMS connection logs) | [/api/execution/connectors](DemandPlanningSaaS/backend/main.py#L3279) |
| **Slotting Optimization** | **Missing** | *N/A* |
| **Congestion Prediction** | **Missing** | *N/A* |
| **Throughput Forecasting** | **Missing** | *N/A* |
| **Labor Planning** | **Missing** | *N/A* |

---

### 13. Executive Control Tower

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **Enterprise KPI Dashboard** | **Strong** (Integrated dashboards inside Global Analytics displaying trailing metrics) | [analytics/index.tsx](DemandPlanningSaaS/frontend/src/modules/analytics/index.tsx) |
| **Revenue Risk Dashboard** | **Strong** (Variance cards mapping gap to budget targets, carrying cost, and revenue at risk) | [sop/index.tsx](DemandPlanningSaaS/frontend/src/modules/sop/index.tsx) • [finance/index.tsx](DemandPlanningSaaS/frontend/src/modules/finance/index.tsx) |
| **Inventory Risk Dashboard** | **Strong** (Stockout alarms, carrying costs, and E&O metrics grouped visually) | [analytics/index.tsx](DemandPlanningSaaS/frontend/src/modules/analytics/index.tsx) |
| **Supplier Risk Dashboard** | **Strong** (Computed supplier scorecards tracking lead time volatility and risk ratings) | [analytics/index.tsx](DemandPlanningSaaS/frontend/src/modules/analytics/index.tsx) |
| **Executive AI Briefing** | **Strong** (Planora AI Insights panels synthesizing anomaly detection and business alerts) | [analytics/index.tsx](DemandPlanningSaaS/frontend/src/modules/analytics/index.tsx) |
| **Cross-Functional Alerts** | **Strong** (System toast engine and visual warning indicators color-coded by severity) | `Toast.tsx` • [AppShell.tsx](DemandPlanningSaaS/frontend/src/components/ui/AppShell.tsx) |
| **Workforce Risk Dashboard** | **Missing** | *N/A* |

---

### 14. Data & Analytics

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **BI Dashboards** | **Strong** (Pre-built dashboards showing comprehensive visual metrics) | [bi/index.tsx](DemandPlanningSaaS/frontend/src/modules/bi/index.tsx) |
| **Visual Query Builder** | **Strong** (Interactive query builder panel in BI workspace) | [bi/index.tsx](DemandPlanningSaaS/frontend/src/modules/bi/index.tsx) |
| **Custom Dashboards** | **Strong** (Fully drag-and-drop dashboard customizer layout) | [bi/index.tsx](DemandPlanningSaaS/frontend/src/modules/bi/index.tsx) |
| **Data Exploration** | **Strong** (Server-paginated data grid displaying raw data uploads with sorting/filtering) | `DataExplorer.tsx` • [demand/index.tsx](DemandPlanningSaaS/frontend/src/modules/demand/index.tsx) |
| **Self-Service Analytics** | **Strong** (Planners can create, customize, and save custom BI widgets) | [bi/index.tsx](DemandPlanningSaaS/frontend/src/modules/bi/index.tsx) |
| **Semantic Layer** | **Missing** | *N/A* |
| **Metric Catalog** | **Missing** | *N/A* |
| **Data Lineage** | **Missing** | *N/A* |

---

### 15. Platform & Governance

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **RBAC** | **Strong** (JWT-based role-based control mapping 4 user tiers to 14 permissions) | [AuthContext.tsx](DemandPlanningSaaS/frontend/src/store/AuthContext.tsx) |
| **Multi-Currency** | **Strong** (Support for 10 currencies with dynamic currency rates) | [PlatformContext.tsx](DemandPlanningSaaS/frontend/src/store/PlatformContext.tsx) |
| **Localization** | **Strong** (Interface scales according to locale selections) | [PlatformContext.tsx](DemandPlanningSaaS/frontend/src/store/PlatformContext.tsx) |
| **Audit Trail** | **Strong** (Database model tracking action type, user, timestamp, and metadata) | [models.py:L41](DemandPlanningSaaS/backend/models.py#L41) • [/api/audit/logs](DemandPlanningSaaS/backend/main.py#L340) |
| **Workflow Approvals** | **Strong** (Approval queue manager handling pending items, requester info, status, and comments) | [models.py:L84](DemandPlanningSaaS/backend/models.py#L84) • [/api/workflow/approval/pending](DemandPlanningSaaS/backend/main.py#L983) |
| **Version Control** | **Strong** (Saves operational forecast versions and performs side-by-side dataset version diff comparisons) | [/api/datasets/diff](DemandPlanningSaaS/backend/main.py#L2248) • [/api/forecast/save-version](DemandPlanningSaaS/backend/main.py#L2156) |
| **Master Data Management** | **Strong** (Seeded SKU registry API supporting SKU codes, category, costs, lead times, and suppliers) | [models.py:L99](DemandPlanningSaaS/backend/models.py#L99) • [/api/master-data/skus](DemandPlanningSaaS/backend/main.py#L1041) |
| **Data Governance** | **Partial** (Secured using granular action permission checks combined with system audit trails) | [AuthContext.tsx](DemandPlanningSaaS/frontend/src/store/AuthContext.tsx) |

---

### 16. Execution Systems

| Feature | Capability Status | Codebase Reference |
| :--- | :--- | :--- |
| **ERP Integration** | **Partial / Simulated** (Simulated SAP S/4HANA & Oracle Fusion connectors with outbound PO document generators) | [/api/execution/connectors](DemandPlanningSaaS/backend/main.py#L3279) • [/api/execution/generate-document](DemandPlanningSaaS/backend/main.py#L3133) |
| **WMS Integration** | **Partial / Simulated** (Simulated Manhattan WMS connector with outbound Transfer Order generators) | [/api/execution/connectors](DemandPlanningSaaS/backend/main.py#L3279) • [/api/execution/generate-document](DemandPlanningSaaS/backend/main.py#L3133) |
| **Real-Time APIs** | **Partial / Simulated** (API Registry displaying active endpoints, target consumers, rate limits, and latency indicators) | [/api/execution/api-registry](DemandPlanningSaaS/backend/main.py#L3393) |
| **TMS Integration** | **Partial / Simulated** (Simulated ORTEC TMS connector with outbound Motor Carrier Load Tender EDI generators) | [/api/execution/connectors](DemandPlanningSaaS/backend/main.py#L3279) • [/api/execution/generate-document](DemandPlanningSaaS/backend/main.py#L3133) |
| **Procurement Integration** | **Partial / Simulated** (Simulated Coupa Procurement connector with outbound Purchase Requisition triggers) | [/api/execution/connectors](DemandPlanningSaaS/backend/main.py#L3279) • [/api/execution/generate-document](DemandPlanningSaaS/backend/main.py#L3133) |
| **Event Streaming** | **Partial / Simulated** (Simulated transaction stream ledger of outbound/inbound EDI logs with success rates) | [/api/execution/event-stream](DemandPlanningSaaS/backend/main.py#L3424) |


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
* **Multi-Site Multi-Currency Consolidation**: Provide unified currency translation and localization overlays across diverse geographic supplier nodes.
* **Top-down/Bottom-up Consensus Editing**: Automatically allocate category-level manual forecast adjustments down to individual SKUs proportionally.
* **Real-time EDI Event Streaming Integration**: Connect simulated event-stream webhooks directly into live message queues.
