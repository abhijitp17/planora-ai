# Planora AI — Comprehensive Technical Documentation

**Version:** 2.0 (Phase 1-8 Complete)  
**Last Updated:** June 2026  
**Authors:** Development Team  
**Classification:** Internal — Enterprise Platform Documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision & Philosophy](#product-vision--philosophy)
3. [Architecture Overview](#architecture-overview)
4. [Technology Stack](#technology-stack)
5. [Module Functionality](#module-functionality)
6. [Authentication & Authorization](#authentication--authorization)
7. [AI Copilot System](#ai-copilot-system)
8. [User Interface & Design System](#user-interface--design-system)
9. [Data Models & Schema](#data-models--schema)
10. [API Reference](#api-reference)
11. [Frontend Architecture](#frontend-architecture)
12. [Backend Architecture](#backend-architecture)
13. [Performance & Scalability](#performance--scalability)
14. [Accessibility & Compliance](#accessibility--compliance)
15. [Security & Privacy](#security--privacy)
16. [Deployment Guide](#deployment-guide)
17. [Development Guide](#development-guide)
18. [Testing Strategy](#testing-strategy)
19. [Troubleshooting](#troubleshooting)
20. [Roadmap & Future Enhancements](#roadmap--future-enhancements)

---

## Executive Summary

**Planora AI** is an enterprise-grade Supply Chain Planning and Forecasting Platform designed to rival industry leaders like SAP IBP (Integrated Business Planning) and Oracle Fusion Supply Chain Management. The platform combines advanced statistical forecasting, machine learning models, inventory optimization algorithms, and AI-powered decision support into a unified, intuitive interface.

### Key Differentiators

- **Multi-Model Forecasting Engine**: 15+ forecasting algorithms including ARIMA, Holt-Winters, XGBoost, LightGBM, and hybrid ensembles
- **AI-Agnostic Copilot**: User-configurable AI assistant supporting 9 different providers (Claude, OpenAI, Gemini, Mistral, Kimi, Grok, Cohere, Azure OpenAI, MS Copilot)
- **Real-Time Collaboration**: Audit trail logging, multi-user awareness, and optimistic UI updates
- **Enterprise-Grade Architecture**: JWT authentication, role-based access control, PostgreSQL backend, Docker orchestration
- **WCAG 2.1 AA Compliant**: Full keyboard navigation, ARIA labels, screen reader support, and accessible status indicators
- **Production-Ready**: One-command deployment, structured logging, CI/CD pipeline, and comprehensive error handling

### Platform Capabilities at a Glance

| Capability | Implementation |
|---|---|
| **Demand Planning** | Statistical + ML forecasting, consensus editing, NPI simulation |
| **Inventory Optimization** | Safety stock calculation, multi-echelon network view, replenishment workbench |
| **S&OP / IBP** | Demand-supply balancing, capacity planning, financial reconciliation |
| **Supply Chain Diagnostics** | HOTW tracking, entropy classification, value-add analysis |
| **Financial Simulation** | P&L stress testing, product mix optimization, scenario analysis |
| **Global Analytics** | Cross-functional KPIs, supplier scorecards, inventory health metrics |
| **AI Assistant** | Context-aware copilot with full platform state integration |

---

## Product Vision & Philosophy

### Mission Statement

"To democratize enterprise supply chain intelligence by providing world-class planning capabilities at a fraction of the cost of traditional ERP systems, powered by cutting-edge AI and designed for modern planners."

### Design Philosophy

Planora AI is built on five core principles derived from the **100 Universal Principles of Design**:

1. **Hierarchy of Needs** — Functionality before aesthetics. Every feature works reliably before adding polish.
2. **Progressive Disclosure** — Show only what's needed now. Advanced features are accessible but not overwhelming.
3. **Mental Model Alignment** — Design matches how supply chain planners actually think and work, not abstract technical architectures.
4. **Aesthetic-Usability Effect** — Beautiful interfaces make users more productive and tolerant of edge cases.
5. **80/20 Rule** — Perfect the 20% of features that deliver 80% of value. Demand forecasting and consensus editing get the most attention.

### Target Users

- **Demand Planners** — Run forecasts, adjust consensus, manage new product introductions
- **Supply Chain Managers** — Optimize inventory, balance capacity, reconcile financials
- **Executives** — Monitor KPIs, review S&OP performance, approve strategic scenarios
- **Analysts** — Explore data, export reports, track supplier performance

---

## Architecture Overview

Planora AI follows a modern **three-tier architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Next.js 16 (React 19) — App Router, TypeScript, Tailwind  │
│  • 6 lazy-loaded modules (demand, inventory, etc.)         │
│  • React Context for state (Auth + Platform)               │
│  • TanStack Table for virtual scrolling                    │
│  • Recharts for data visualization                         │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API (HTTP/JSON)
┌────────────────────┴────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│     FastAPI (Python 3.11+) — Async ASGI, SQLAlchemy ORM    │
│  • Statistical models (statsmodels)                         │
│  • ML models (scikit-learn, XGBoost, LightGBM)             │
│  • Ensemble forecasting                                     │
│  • Pagination & filtering logic                            │
└────────────────────┬────────────────────────────────────────┘
                     │ SQLAlchemy ORM
┌────────────────────┴────────────────────────────────────────┐
│                    DATA LAYER                                │
│   PostgreSQL 16 (Production) / SQLite (Development)         │
│  • demand_records — canonical time-series data             │
│  • forecast_results — model predictions                    │
│  • audit_logs — governance & compliance trail              │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

In production, all services run as Docker containers orchestrated by Docker Compose:

- **Frontend Container**: Next.js standalone build, Node.js 20 Alpine, non-root user
- **Backend Container**: FastAPI + uvicorn, Python 3.11 slim, virtual environment isolated
- **Database Container**: PostgreSQL 16 Alpine, persistent volumes, automated backups
- **Reverse Proxy** (external): Nginx or Caddy for HTTPS termination and load balancing

### Data Flow

1. **Upload Pipeline**: CSV/Excel → FastAPI endpoint → Column mapping → Canonical schema → PostgreSQL bulk insert
2. **Forecast Pipeline**: User selects SKU + model → API request → Model training → Backtest → Prediction → Chart rendering
3. **Consensus Editing**: UI grid edits → Optimistic update → Debounced API save → Audit log → Database commit
4. **AI Copilot**: User message → Context injection (module, SKU, KPIs) → Provider API stream → Token-by-token rendering → History persistence

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose | Justification |
|---|---|---|---|
| **Next.js** | 16.2.1 | React framework | App Router for file-based routing, server components, automatic code splitting |
| **React** | 19.2.4 | UI library | Latest version with concurrent rendering, improved hooks |
| **TypeScript** | 5.x | Type safety | Compile-time error detection, better IDE support, self-documenting code |
| **Recharts** | 3.8.0 | Data visualization | Composable chart primitives, responsive by default, good React integration |
| **TanStack Table** | 8.x | Data grids | Virtual scrolling, server-side pagination, flexible column definitions |
| **TanStack Virtual** | 3.x | Virtual rendering | Handles 10,000+ row tables without performance degradation |
| **Lucide React** | 1.0.1 | Icon library | 1,000+ icons, tree-shakeable, consistent design |

### Backend Stack

| Technology | Version | Purpose | Justification |
|---|---|---|---|
| **FastAPI** | 0.100+ | Web framework | Async support, automatic OpenAPI docs, Pydantic validation, fastest Python framework |
| **Uvicorn** | 0.23+ | ASGI server | Production-grade async server with HTTP/2 support |
| **SQLAlchemy** | 2.0+ | ORM | Type-safe queries, migration support, PostgreSQL/SQLite abstraction |
| **Pandas** | 2.0+ | Data manipulation | Time-series handling, CSV/Excel parsing, dataframe operations |
| **statsmodels** | 0.14+ | Statistical models | ARIMA, SARIMAX, Holt-Winters, exponential smoothing |
| **scikit-learn** | 1.3+ | ML algorithms | Random Forest, Decision Trees, preprocessing pipelines |
| **XGBoost** | 2.0+ | Gradient boosting | State-of-the-art tree-based models, fast training |
| **LightGBM** | 4.0+ | Gradient boosting | Memory-efficient alternative to XGBoost, handles large datasets |
| **Pydantic** | 2.0+ | Data validation | Request/response schema validation, automatic docs generation |

### Database Stack

| Component | Version | Purpose |
|---|---|---|
| **PostgreSQL** | 16 | Production database |
| **SQLite** | 3.x | Development database |
| **Alembic** | (future) | Database migrations |

### Infrastructure & DevOps

| Tool | Purpose |
|---|---|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **GitHub Actions** | CI/CD pipeline |
| **Nginx / Caddy** | Reverse proxy & HTTPS |
| **Sentry** (optional) | Error tracking |
| **Prometheus** (optional) | Metrics collection |

### AI Provider Integrations

| Provider | API | Models Supported |
|---|---|---|
| **Anthropic** | Claude API | Opus 4.5, Sonnet 4.5, Haiku 4.5 |
| **OpenAI** | Chat Completions | GPT-4o, GPT-4o-mini, o3, o4-mini |
| **Google** | Gemini API | Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash |
| **Mistral** | Chat API | Large, Small, Codestral |
| **Moonshot** | Kimi API | 128K, 32K context models |
| **xAI** | Grok API | Grok 3, Grok 3 Mini |
| **Cohere** | Chat API | Command R+, Command R, Command Light |
| **Azure OpenAI** | Azure API | GPT-4o (Azure deployment) |
| **Microsoft** | Copilot API | Copilot (GPT-4o backend) |

---

## Module Functionality

### 1. Demand Planning Module

**Purpose**: Predict future demand using statistical and machine learning models, enable planner consensus editing, and simulate new product introductions.

#### Features

**Multi-Model Forecasting**
- **Statistical Models**: Moving Average (SMA), Simple Exponential Smoothing (SES), Holt (double exponential), Holt-Winters (triple exponential with seasonality), ARIMA, Seasonal ARIMA (SARIMA), ARIMAX (with exogenous variables), Seasonal ARIMAX (SARIMAX), Croston / SBA / TSB (for intermittent demand)
- **Machine Learning Models**: Decision Trees, Random Forest, Extra Trees Regressor, AdaBoost, XGBoost, LightGBM
- **Ensemble Methods**: Simple average, weighted average, stacked ensemble

**Consensus Forecast Editor**
- Interactive pivot grid showing historical actuals, statistical baseline, confidence intervals, and final consensus
- Planners can apply percentage uplifts/downlifts to any future period
- Real-time calculation of consensus volume = baseline × (1 + adjustment%)
- Color-coded cells highlight where manual adjustments have been made
- Changes are logged to the audit trail automatically

**New Product Introduction (NPI)**
- Simulate demand for products with zero sales history
- Clone and scale the profile of a similar existing SKU
- Set launch date and initial volume uplift percentage
- Generates proxy demand curve based on historical patterns

**Performance Analysis**
- Backtest metrics for all models: MAE, RMSE, MAPE
- Model comparison table with recommendation engine
- Live API metrics displayed when real forecast is run
- Visual indicator shows which model is Primary Fit (MAPE < 5%)

#### Tabs

1. **Overview Dashboard** — Category volume distribution, historical aggregate demand charts, 4 KPI tiles (System MAPE, Active Horizon, Items in Exception, Consensus Delta)
2. **Forecast Editor** — Interactive chart with statistical baseline, probabilistic bounds, and consensus forecast line; horizontal pivot grid for period-by-period editing
3. **Performance** — Algorithm comparison table with MAE/RMSE/MAPE, live backtest metrics from FastAPI when forecast is run
4. **New Product Intro (NPI)** — Configuration workspace to borrow SKU profiles and generate proxy forecasts
5. **Data Explorer** — Live server-paginated view of uploaded demand records with virtual scrolling, sort, search, CSV export

#### User Roles & Permissions

- **Viewer**: Can view all tabs, cannot edit consensus or run forecasts
- **Planner**: Can edit consensus, run forecasts, upload datasets
- **Manager**: All planner permissions
- **Admin**: All permissions

---

### 2. Inventory Optimization Module

**Purpose**: Recalculate safety stock levels, track multi-echelon inventory across the network, and generate replenishment recommendations.

#### Features

**Safety Stock Simulator**
- Adjustable service level slider (80% to 99.9%)
- Real-time calculation of required safety stock using: `SS = Z × √[(LT × σ_d²) + (D_avg² × σ_LT²)]`
- Capital impact analysis — shows dollar value tied up in safety stock
- Visualizes supply volatility (lead time variance) vs demand volatility
- AI insights recommend lead time reduction strategies to free working capital

**Multi-Echelon Network View**
- Table showing on-hand quantity, in-transit quantity, unit cost, inventory value, average daily demand, and Days of Supply (DoS) for every SKU
- Status indicators: Healthy (green ✓), Stockout Risk (red ✕), Excess E&O (amber ▲)
- Color + icon + text for accessibility compliance (not color-only)
- Drill-down to location-level inventory with virtual scrolling

**Replenishment Workbench**
- Auto-calculates Reorder Point (ROP) and Economic Order Quantity (EOQ) for each SKU
- Formula: `ROP = (Avg Daily Demand × Lead Time) + Safety Stock`
- Formula: `EOQ = √[(2 × Annual Demand × Order Cost) / (Unit Cost × Holding %)]`
- Generates actionable "Create PO" buttons for items below ROP
- Export replenishment recommendations to CSV

#### Tabs

1. **Network Dashboard** — 4 KPI tiles (Total Network Value, In-Transit Value, Avg Lead Time, At-Risk Stockouts), multi-echelon network table
2. **Safety Stock Simulator** — Interactive service level slider, visualizations of demand/supply volatility, capital impact calculator
3. **Replenishment Workbench** — Dynamic ROP/EOQ table with PO generation actions

#### User Roles & Permissions

- **Viewer**: View network dashboard only
- **Planner**: All tabs, can adjust safety stock targets
- **Manager**: All permissions
- **Admin**: All permissions

---

### 3. Supply Chain Diagnostics Module

**Purpose**: Monitor forecast automation quality, classify SKUs by demand pattern complexity, and identify opportunities for algorithmic improvement.

#### Features

**Hands-Off-the-Wheel (HOTW) Tracking**
- Measures percentage of forecasts generated by ML without manual planner intervention
- Compares System MAPE (pure ML baseline) vs Human MAPE (planner-adjusted)
- Calculates **Positive Value Add**: percentage of SKUs where human override improves accuracy
- Identifies SKUs where planners add noise rather than value
- Gauge visualization shows global HOTW score

**Entropy Scanner**
- Classifies SKUs into 4 quadrants based on Coefficient of Variation (CV) and Average Demand Interval (ADI):
  - **Smooth**: Low CV, low ADI — predictable, easily forecastable
  - **Intermittent**: Low CV, high ADI — sporadic but consistent size
  - **Erratic**: High CV, low ADI — volatile volume, frequent orders
  - **Lumpy**: High CV, high ADI — irregular volume and timing
- Scatter plot visualization with color-coded quadrants
- Portfolio Forecastability Score (A to F grade based on entropy distribution)
- Recommends switching erratic/lumpy SKUs to Croston or other intermittent-demand methods

**Forecast Value Added (FVA) Analysis**
- Table showing per-SKU: ML System MAPE, Human Planner MAPE, Override Frequency, Value Add Impact
- Calculates FVA = System MAPE - Human MAPE (positive = value added, negative = noise added)
- Recommends locking high-noise SKUs to pure algorithmic forecasting

#### Tabs

1. **Hands-off-the-Wheel Tracker** — HOTW gauge, FVA table, AI recommendations for automation
2. **Entropy Scanner** — Quadrant scatter plot, portfolio breakdown by demand pattern, forecastability score

#### User Roles & Permissions

- **Viewer**: Cannot access (diagnostics requires planner+)
- **Planner**: Full access
- **Manager**: Full access
- **Admin**: Full access

---

### 4. S&OP / Integrated Business Planning Module

**Purpose**: Bridge operational demand forecasts with financial targets, balance demand against supply capacity constraints, and reconcile to the Annual Operational Plan (AOP).

#### Features

**Executive Summary Dashboard**
- 4 KPI tiles: AOP Revenue Target (FY26), Constrained LE Revenue, Gross Margin (LE), Revenue at Risk
- Portfolio breakdown table by category showing AOP target vs unconstrained demand vs supply capacity
- Variance analysis highlighting margin risk
- Color-coded status showing trending above/below AOP

**Demand-Supply Balancing (RCCP)**
- Rough-Cut Capacity Planning chart showing unconstrained demand vs supply capacity limit over 12 months
- Identifies periods where demand exceeds capacity (peak seasons)
- Capacity constraint controls: enable air freight expedite, activate subcontractor flex tier
- AI recommendations for capacity expansion vs margin sacrifice tradeoffs

**Financial Reconciliation**
- P&L matrix table showing revenue, COGS, gross margin by product line
- Compares: Operational Baseline vs Unconstrained Forecast vs AOP Target
- Absolute dollar variance calculated per line item
- Constrained supply volumes mapped to projected gross margins

#### Tabs

1. **Executive Summary** — AOP performance overview, portfolio breakdown by category
2. **Demand-Supply Balancing (RCCP)** — Capacity utilization chart, constraint toggles, AI resolution recommendations
3. **Financial Reconciliation** — Integrated Financial Plan ledger with revenue/cost/margin breakdown

#### User Roles & Permissions

- **Viewer**: Cannot access (S&OP requires manager+)
- **Planner**: Cannot access
- **Manager**: Full access
- **Admin**: Full access

---

### 5. Financial Simulation Module

**Purpose**: Stress-test P&L under different scenarios, optimize product mix during capacity constraints, and reconcile to the Master Financial Plan.

#### Features

**Scenario Simulation**
- 5 interactive sliders to model:
  - **Demand Volume Shock**: ±40% demand shift
  - **Price Elasticity (ASP)**: ±20% average selling price adjustment
  - **COGS & Sourcing Costs**: ±30% cost fluctuation
  - **Promotional Uplift Volume**: +50% temporary spike
  - **Capacity Expansion**: +100% production limit increase
- Real-time recalculation of Revenue, COGS, Gross Margin ($), Gross Margin (%)
- Scenario Delta table showing Baseline vs Stress-Test vs Absolute Delta
- EBITDA impact calculator

**Product Mix Optimization**
- Algorithmic ranking of SKUs by Gross Margin % to prioritize high-yield products
- Calculates margin per unit and margin percentage for each SKU
- Recommendations: Prioritize (High Yield) for >60% GM, Deprioritize for <30% GM
- AI insights suggest halting low-margin production to reallocate capacity

**Master Financial Plan (IFP)**
- Integrated ledger showing Revenue Plan, Cost Plan, Margin Plan by category
- Compares AOP Baseline (Budget) vs Unconstrained Forecast vs Constrained Operational Plan
- Variance to Budget calculated per financial division
- Breaks down by product category (Accessories, Electronics, Furniture)

#### Tabs

1. **Scenario Simulation** — Interactive sliders, P&L impact matrix, EBITDA delta
2. **Product Mix & Margin Optimization** — SKU ranking table, margin analysis, AI recommendations
3. **Master Financial Plan** — IFP ledger with revenue/cost/margin breakdown by category

#### User Roles & Permissions

- **Viewer**: Cannot access (finance requires manager+)
- **Planner**: Cannot access
- **Manager**: Full access
- **Admin**: Full access

---

### 6. Global Supply Chain Analytics Module

**Purpose**: Provide cross-functional visibility into demand accuracy, inventory health, service levels, supplier performance, and financial capital efficiency.

#### Features

**Demand & Sales Analytics**
- Forecast vs Actual Attainment chart (12 months trailing)
- Systemic Bias calculation (overforecast/underforecast percentage)
- High Volatility SKU count (CV > 0.6)
- Weighted MAPE (WMAPE) across all SKUs

**Inventory Health Analytics**
- Global Inventory Turns calculation (Annual COGS / Avg Inventory Value)
- Days of Inventory (DOH) metric
- Excess & Obsolete (E&O) value calculation (SKUs with >3 months supply on hand)
- Stockout event count (last 30 days)
- Inventory Health Risk Classification table with turn rate analysis
- Working Capital vs Gross Margin scatter plot

**Service & Fulfillment Analytics**
- Global OTIF (On-Time In-Full) tracking
- Order Fill Rate percentage
- Estimated Lost Sales calculation due to backorders
- 12-week service level trending chart (OTIF % and Fill Rate %)

**Supplier & Capacity Analytics**
- Supplier Performance Scorecard with: average lead time, lead time volatility, inbound OTIF %, capacity utilization estimate, computed supply risk
- Visual risk indicators (High/Medium/Low) with color + icon + text
- Progress bars for OTIF % achievement

**Financial Capital Analytics**
- Working Capital Trapped (Inventory) total
- Annualized Inventory Carrying Cost (20% APICS rate covering storage, insurance, obsolescence, opportunity cost)
- Working Capital vs Gross Margin scatter plot to identify capital traps

**Planora AI Insights** (AI-Generated)
- Real-time anomaly detection: inventory optimization opportunities, demand spike warnings, supplier delay risk escalations, E&O alerts
- Each insight card shows: severity icon, recommendation, and specific action (e.g., "Reduce safety stock by 12%")
- Color-coded by priority (green = opportunity, amber = warning, red = critical)

#### Tabs

1. **Demand & Sales** — Forecast accuracy, bias analysis, volatility metrics
2. **Inventory Health** — Turns, DOH, E&O, stockout tracking, health classification
3. **Service & Fulfillment** — OTIF tracking, fill rate, lost sales, trending charts
4. **Supplier & Capacity** — Supplier scorecard, lead time analysis, risk assessment
5. **Financial Capital** — Working capital analysis, carrying cost, capital efficiency scatter
6. **✨ Planora AI Insights** — AI-generated anomaly detection, prescriptive recommendations

#### User Roles & Permissions

- **Viewer**: Full access to all analytics tabs
- **Planner**: Full access
- **Manager**: Full access
- **Admin**: Full access

---

## Authentication & Authorization

### Authentication Flow

Planora AI implements **JWT-based stateless authentication** with session persistence:

```
┌──────────┐                 ┌──────────┐                 ┌──────────┐
│  User    │                 │ Frontend │                 │ Backend  │
│  Browser │                 │  React   │                 │  FastAPI │
└────┬─────┘                 └────┬─────┘                 └────┬─────┘
     │                            │                            │
     │ 1. Enter email/password    │                            │
     ├───────────────────────────>│                            │
     │                            │                            │
     │                            │ 2. POST /api/auth/login   │
     │                            ├───────────────────────────>│
     │                            │    {email, password}       │
     │                            │                            │
     │                            │ 3. Validate credentials    │
     │                            │<───────────────────────────┤
     │                            │    {token, user, expires}  │
     │                            │                            │
     │ 4. Store in localStorage   │                            │
     │<───────────────────────────┤                            │
     │    + redirect to dashboard │                            │
     │                            │                            │
     │ 5. All API calls include   │                            │
     │    Authorization: Bearer   │                            │
     │    {token}                 │                            │
     │                            ├───────────────────────────>│
     │                            │                            │
     │                            │ 6. Verify JWT signature   │
     │                            │    + expiry                │
     │                            │<───────────────────────────┤
     │                            │    {data}                  │
```

### User Roles

| Role | Rank | Capabilities |
|---|---|---|
| **Viewer** | 0 | Read-only access to Demand, Inventory, Analytics modules. Cannot edit forecasts, upload data, or run calculations. |
| **Planner** | 1 | Viewer + edit forecasts, adjust consensus, upload datasets, run forecast engine, access Diagnostics module. |
| **Manager** | 2 | Planner + access S&OP module, Finance module, manage settings, export all data. |
| **Admin** | 3 | Manager + user management, admin panel access, system configuration, full audit log access. |

### RBAC (Role-Based Access Control)

The platform implements 14 granular actions with minimum role requirements:

| Action | Permission | Min Role |
|---|---|---|
| `view:dashboard` | Access landing page | viewer |
| `view:demand` | Access Demand Planning module | viewer |
| `view:inventory` | Access Inventory Optimization module | viewer |
| `view:diagnostics` | Access SC Diagnostics module | **planner** |
| `view:sop` | Access S&OP / IBP module | **manager** |
| `view:finance` | Access Financial Simulation module | **manager** |
| `view:analytics` | Access Global Analytics module | viewer |
| `edit:forecast` | Modify forecast parameters | **planner** |
| `edit:consensus` | Edit consensus adjustments | **planner** |
| `upload:dataset` | Upload CSV/Excel datasets | **planner** |
| `run:forecast` | Execute forecast engine | **planner** |
| `export:data` | Export tables to CSV | **planner** |
| `manage:users` | User management panel | **admin** |
| `manage:settings` | System configuration | **admin** |

### Permission Checking

Frontend components use the `can()` helper from `useAuth()`:

```typescript
const { can } = useAuth();

// Conditionally render based on permission
{can('upload:dataset') && (
  <button onClick={handleUpload}>Upload Data</button>
)}

// Disable actions for unauthorized users
<button 
  onClick={runForecast} 
  disabled={!can('run:forecast')}
>
  Run Forecast
</button>
```

Backend endpoints verify permissions via JWT payload:

```python
@app.post("/api/forecast")
async def generate_forecast(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ['planner', 'manager', 'admin']:
        raise HTTPException(403, "Insufficient permissions")
    # ... forecast logic
```

### Session Management

- **Expiry**: 8 hours by default (configurable via `JWT_EXPIRY_HOURS`)
- **Storage**: localStorage with automatic expiry check every 60 seconds
- **Refresh**: Silent token refresh when <1 hour remaining (future enhancement)
- **Logout**: Clears localStorage and redirects to login page
- **Auto-logout**: Session cleared if token expires while user is active

### Demo Accounts

For development and testing, 4 demo accounts are pre-configured:

| Email | Password | Role | Use Case |
|---|---|---|---|
| admin@planora.ai | admin123 | admin | Full system access, user management |
| manager@planora.ai | manager123 | manager | S&OP, Finance, strategic planning |
| planner@planora.ai | planner123 | planner | Day-to-day forecasting and planning |
| viewer@planora.ai | viewer123 | viewer | Dashboard monitoring, read-only access |

**Security Note**: Change all default passwords before production deployment.

---

## AI Copilot System

### Architecture

The AI Copilot is a **provider-agnostic streaming assistant** that integrates with 9 different AI platforms. Users can switch providers on-the-fly and even run multiple conversations with different models simultaneously.

### Provider Abstraction Layer

Located in `src/lib/aiProviders.ts`, the abstraction layer provides:

**Unified Interface**
```typescript
export async function callProvider(
  config: ProviderConfig,          // API key, model, endpoint
  messages: ChatMessage[],          // Conversation history
  systemPrompt: string,             // Context injection
  onChunk: (chunk: StreamChunk) => void  // Streaming callback
): Promise<void>
```

**Provider-Specific Implementations**
- `callClaude()` — Anthropic Messages API with SSE streaming
- `callOpenAI()` — OpenAI Chat Completions with SSE
- `callGemini()` — Google GenerativeLanguage API with SSE
- `callMistral()` — Mistral Chat API (OpenAI-compatible)
- `callKimi()` — Moonshot API (OpenAI-compatible)
- `callGrok()` — xAI API (OpenAI-compatible)
- `callCohere()` — Cohere Chat API (unique format with chat_history + preamble)
- `callAzureOpenAI()` — Azure OpenAI with custom endpoint
- `callMSCopilot()` — Microsoft Copilot via Azure backend

### Context Injection

Every conversation includes a dynamically generated system prompt that embeds:

```typescript
buildSystemPrompt({
  activeModule: 'demand',           // Current module
  activeTab: 'editor',              // Current tab
  selectedSku: {                    // Active SKU details
    id: 'ELE_TV_85_OLED',
    name: '85" OLED Television',
    category: 'Electronics',
    base: 1200,
  },
  horizon: 6,                       // Forecast horizon
  model: 'xgboost',                 // Selected forecasting model
  selectedDataset: 'v_20260607_...',  // Dataset version
  kpiSummary: {                     // Live KPIs
    'System MAPE': '4.2%',
    'Active SKUs': 8,
    'Horizon': '6 Months',
  },
})
```

The generated system prompt looks like:

```
You are Planora Copilot — an expert AI assistant embedded inside Planora AI, 
an enterprise supply chain planning platform comparable to SAP IBP or Oracle Fusion SCM.

CURRENT PLATFORM STATE:
- Module: Demand Planning & Forecasting
- Tab: editor
- Active SKU: ELE_TV_85_OLED — 85" OLED Television (Electronics), baseline demand 1,200 units/month.
- Forecasting model: xgboost, horizon: 6 periods
- Dataset version: v_20260607_204625_07192d
Live KPIs: System MAPE: 4.2%, Active SKUs: 8, Horizon: 6 Months.

YOUR ROLE:
You have deep expertise in demand planning, inventory optimization, S&OP, 
financial reconciliation, and supply chain diagnostics. You understand statistical 
forecasting (ARIMA, Holt-Winters, exponential smoothing) and ML models 
(XGBoost, LightGBM, Random Forest).

BEHAVIOUR RULES:
1. Always ground responses in the platform's current state shown above.
2. Provide specific, actionable recommendations — not generic advice.
3. When referencing metrics, use the exact KPI values from the platform context.
4. For calculations, show your working briefly.
5. If the user asks you to perform an action (e.g. "run a forecast"), 
   explain what they should click in the platform.
6. Keep responses concise but complete — enterprise users are time-constrained.
7. Format numbers with commas and units (e.g. 12,400 units, 4.2% MAPE, $180K revenue).
8. Respond in the same language the user writes in.
```

### Configuration Modes

**User-Level Configuration**
- Each user configures their own API keys for each provider
- Keys stored in browser localStorage (never sent to Planora servers)
- Can switch between configured providers instantly via quick-switch bar
- Model selection persists per provider

**Admin-Level Override**
- Admin can set organization default provider
- Toggle "Allow user override" to lock all users to organization provider
- Pre-configured keys (when admin sets them while authenticated)
- In production, inject org keys via backend environment variables

### Privacy & Security

- **No key transmission**: API keys go directly from browser to AI provider, never through Planora servers
- **No conversation storage on server**: Chat history stored only in user's localStorage
- **Provider-direct calls**: All API requests originate from the user's browser to the AI provider's API
- **Audit logging**: User actions (run forecast, upload data) are logged, but conversation content is not

### Streaming Implementation

Token-by-token rendering for responsive feel:

```typescript
let accumulated = '';
await callProvider(config, messages, systemPrompt, ({ delta, done }) => {
  if (done) return;
  accumulated += delta;
  setMessages(prev => {
    const updated = [...prev];
    const last = updated[updated.length - 1];
    if (last?.id === assistantMsg.id) {
      updated[updated.length - 1] = { ...last, content: accumulated };
    }
    return updated;
  });
});
```

### Conversation Persistence

- **History limit**: Last 100 messages kept in localStorage
- **Session continuity**: Conversations persist across browser sessions
- **Clear history**: One-click clear with confirmation
- **Auto-save**: Every message automatically saved after streaming completes

### Suggestion Chips

When conversation is empty, 4 contextual suggestions appear:
- "Summarise the current inventory risk"
- "Why is MAPE high for this SKU?"
- "Recommend a safety stock adjustment"
- "What's the revenue at risk this month?"

Clicking a chip fills the input box (doesn't auto-send) so user can edit before submitting.

---

## User Interface & Design System

### Design Principles

The Planora AI design system is built on **precision, clarity, and speed**:

1. **Glassmorphic Premium** — Subtle transparency, frosted panels, clean borders (0.5px)
2. **Minimal Cognitive Load** — Progressive disclosure, contextual actions, smart defaults
3. **Data-First** — Charts and tables are the primary content, controls are secondary
4. **Consistent Patterns** — Every module follows the same layout: header breadcrumb → tabs → KPI tiles → workspace panels
5. **Responsive Feedback** — Every action has immediate visual response (toast, loading spinner, optimistic update)

### Color System

**Primary Palette**
- **Accent Primary**: #064e3b (Premium Dark Green) — primary actions, active states, brand identity
- **Accent Secondary**: #d4af37 (Champagne Gold) — highlights, secondary accents
- **Status Colors**: 
  - Success: #16a34a (green) with ✓ icon
  - Warning: #d97706 (amber) with ▲ icon
  - Error: #dc2626 (red) with ✕ icon
  - Info: #2563eb (blue) with ℹ icon

**Semantic Colors**
- Chart Actual: #1e2535 (near-black for data lines)
- Chart Forecast: #94a3b8 (muted gray for predictions)
- Chart Consensus: #064e3b (accent green for planner-adjusted)
- Chart Bounds: rgba(6, 78, 59, 0.12) (transparent green for confidence intervals)

**Dark Mode Support**
- All colors defined as CSS custom properties that switch on `[data-theme='dark']`
- Background main: #f4f5f6 (light) → #121212 (dark)
- Text main: #1f2937 (light) → #f3f4f6 (dark)
- Borders: #e2e8f0 (light) → #333333 (dark)

### Typography

- **Primary Font**: Inter (sans-serif) — Loaded from Google Fonts, clean and professional
- **Display Font**: Clash Display (headings on landing page) — Custom branding font
- **Monospace**: System monospace for code, dataset versions, SKU IDs
- **Weights**: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Type Scale**
- Display (landing): 3.5rem–6.5rem (responsive)
- H1: 1.4rem (module breadcrumb)
- H2: 1.2rem (panel headers)
- H3: 1rem (section headers)
- Body: 0.875rem–0.9rem (primary content)
- Caption: 0.75rem–0.8rem (labels, metadata)
- Micro: 0.65rem–0.7rem (timestamps, badges)

### Component Library

**Buttons**
- **Primary**: Solid accent background, white text, used for main actions (Run Forecast, Upload, Save)
- **Outline**: Transparent background, accent border, used for secondary actions (Refresh, Export, Cancel)
- **Ghost**: No border, hover background only, used for tertiary actions (Close, Minimize)
- **Labeled**: Icon + text for clarity (Phase 1 improvement)
- **Touch targets**: Minimum 40×40px for accessibility

**Cards**
- **KPI Infolet**: Metric cards with label (small caps) + value (large) + subtext
- **Workspace Panel**: Main content container with 1.5rem padding, 1px border, 6px radius
- **AI Panel**: Highlighted panel with left accent border, light green background, contains AI recommendations

**Badges**
- **Role Badge**: Color-coded by role (Admin=purple, Manager=amber, Planner=blue, Viewer=green)
- **Status Badge**: Icon + text + color (Success, Warning, Error, Info, Neutral)
- **Category Badge**: Small gray badges for metadata (ML vs Statistical, product categories)

**Form Controls**
- **Inputs**: 1px border, 4px radius, focus state changes border to accent color
- **Selects**: Styled consistently with inputs, chevron-down icon
- **Range Sliders**: 4px track, 18px circular thumb, accent color on active
- **Consensus Inputs**: Special narrow inputs (80px) in forecast editor grid, right-aligned numbers

**Data Tables**
- **Standard Table**: Sticky header, hover row highlight, striped optional
- **Virtual Table** (Phase 5): TanStack Table + Virtual for 10,000+ rows
- **Sticky First Column**: Left column stays fixed during horizontal scroll
- **Sortable Columns**: Click header to toggle sort direction, visual indicator shows current sort
- **Pagination Controls**: First/Prev/Next/Last buttons + page size selector

**Modals & Panels**
- **Left Rail Nav**: Collapsible 220px → 64px, icon-only collapsed mode
- **SKU Sidebar**: 320px fixed, category dropdown + search input
- **Copilot Panel**: 440px slide-in from right, backdrop blur, three internal views (Chat/Settings/Admin)
- **Notification Dropdown**: 320px dropdown from header, mark all read action
- **Profile Dropdown**: 220px dropdown with user info, settings link, sign out

**Loading States**
- **Skeleton Shimmer**: Animated gradient for cards, charts, tables while loading
- **Spinner**: 18px circular spinner for button loading states
- **Forecast Overlay**: Full-panel overlay during API forecast execution
- **API Status Dot**: Green/amber/red indicator for backend connectivity

**Toasts**
- 4 variants: Success (green ✓), Error (red ✕), Warning (amber ▲), Info (blue ℹ)
- Auto-dismiss after 5 seconds
- Stacks in bottom-right corner
- Dismissible via X button
- Copy button on assistant messages in Copilot

### Layout System

**Grid Utilities**
- `.grid-cols-2`, `.grid-cols-3`, `.grid-cols-4` — responsive grids
- `.gap-2` through `.gap-8` — spacing utilities
- Auto-fit grids for responsive card layouts

**Flexbox Utilities**
- `.flex`, `.flex-col` — direction
- `.items-center`, `.justify-between`, `.gap-4` — alignment and spacing

**Spacing Scale**
- 0.25rem (4px) — micro gaps
- 0.5rem (8px) — small gaps
- 0.75rem (12px) — medium gaps
- 1rem (16px) — standard gap
- 1.5rem (24px) — large gap
- 2rem (32px) — section spacing

### Responsive Breakpoints

While the platform is desktop-first, responsive rules ensure tablet compatibility:

- **1200px+**: Full sidebar + left rail + main workspace visible
- **900px–1200px**: Sidebar collapsible, left rail persistent
- **600px–900px**: Hamburger menu for left rail, sidebar toggleable
- **<600px**: Mobile layout with stacked panels (future enhancement)

---

## Data Models & Schema

### Database Tables

#### demand_records

The canonical time-series demand data table.

| Column | Type | Index | Nullable | Description |
|---|---|---|---|---|
| `id` | Integer | PK | No | Auto-increment primary key |
| `date` | DateTime | Yes | No | Period timestamp (day/week/month) |
| `target_demand` | Float | No | No | Historical actual quantity sold |
| `sku` | String | Yes | No | Stock Keeping Unit identifier |
| `category` | String | Yes | No | Product line classification |
| `location` | String | Yes | No | Warehouse/DC/store locator |
| `channel` | String | Yes | No | Sales channel (Online, Retail, Wholesale) |
| `hierarchy_levels` | JSON | No | Yes | Custom hierarchies (region, brand, etc.) |
| `exogenous_variables` | JSON | No | Yes | External factors (price, promo, weather) |
| `planner_id` | String | Yes | Yes | User who uploaded/owns this data |
| `dataset_version` | String | Yes | No | Version identifier for isolation |

**Indexes**: (sku), (category), (date), (dataset_version), (planner_id)

#### forecast_results

Stores model predictions for historical tracking and comparison.

| Column | Type | Index | Nullable | Description |
|---|---|---|---|---|
| `id` | Integer | PK | No | Auto-increment primary key |
| `date` | DateTime | Yes | No | Forecast period timestamp |
| `forecast_demand` | Float | No | No | Predicted quantity |
| `sku` | String | Yes | No | SKU identifier |
| `model_name` | String | Yes | No | Model used (xgboost, arima, etc.) |
| `ensemble_strategy` | String | Yes | Yes | Ensemble method if applicable |
| `horizon` | Integer | No | No | How many periods ahead |
| `dataset_version` | String | Yes | No | Source dataset version |

**Indexes**: (sku), (model_name), (date), (dataset_version)

#### audit_logs

Governance and auditability trail for all user actions.

| Column | Type | Index | Nullable | Description |
|---|---|---|---|---|
| `id` | Integer | PK | No | Auto-increment primary key |
| `user_id` | String | Yes | No | User who performed action |
| `role` | String | No | No | User's role at time of action |
| `timestamp` | DateTime | Yes | No | UTC timestamp of action |
| `actionType` | String | Yes | No | Type of action (upload_dataset, run_forecast, etc.) |
| `dataset` | String | No | Yes | Dataset version affected |
| `metadata_json` | JSON | No | Yes | Structured action details (SKU, model, params) |

**Indexes**: (user_id), (timestamp), (actionType)

### Frontend Data Types

#### SKU Interface

```typescript
interface SKU {
  id: string;                    // Unique SKU identifier
  name: string;                  // Display name
  category: string;              // Product category
  base: number;                  // Baseline monthly demand
  type: string;                  // Demand pattern (trending-up, volatile, etc.)
  onHand: number;                // Current inventory quantity
  inTransit: number;             // Pipeline inventory
  unitCost: number;              // COGS per unit
  holdingCostPct: number;        // Annual holding cost as % of unit cost
  leadTime: number;              // Average supplier lead time (days)
  leadTimeStdDev: number;        // Lead time standard deviation
  supplyCapacity: number;        // Monthly production capacity
  aopVolume: number;             // AOP target volume
  asp: number;                   // Average selling price
  cv: number;                    // Coefficient of Variation
  adi: number;                   // Average Demand Interval
  sysMape: number;               // ML system MAPE
  humMape: number;               // Human planner MAPE
  overrideRate: number;          // % of periods manually adjusted
  history: HistoryPoint[];       // Time-series data points
}
```

#### ForecastPoint Interface

```typescript
interface ForecastPoint {
  period: string;                // Period label (2024-03, 2025-W12, etc.)
  actual: number | null;         // Historical actual (null for future)
  forecast: number | null;       // ML baseline prediction
  lowerBound?: number;           // 95% CI lower bound
  upperBound?: number;           // 95% CI upper bound
  consensusVolume?: number;      // Planner-adjusted final forecast
  isHistorical: boolean;         // True for past periods
}
```

#### User Interface

```typescript
interface User {
  id: string;                    // Unique user ID
  name: string;                  // Full name
  email: string;                 // Email (login credential)
  role: UserRole;                // viewer | planner | manager | admin
  orgId: string;                 // Organization identifier (multi-tenancy)
  avatar?: string;               // Profile picture URL (optional)
}
```

---

## API Reference

### Base URL

- **Development**: `http://localhost:8000`
- **Production**: Configured via `NEXT_PUBLIC_API_URL` environment variable

### Authentication

All authenticated endpoints require:
```
Authorization: Bearer {jwt_token}
```

### Endpoints

#### Health Check

```http
GET /
```

**Response**
```json
{
  "status": "ok",
  "service": "Demand Planning & Forecasting Platform"
}
```

---

#### Upload Dataset

```http
POST /api/upload
Content-Type: multipart/form-data
```

**Request Body**
- `file`: CSV or Excel file
- `column_mapping`: JSON string (optional) mapping file columns to canonical schema

**Response**
```json
{
  "filename": "sales_data.csv",
  "status": "SUCCESS",
  "records_processed": 720,
  "dataset_version": "v_20260607_204625_07192d"
}
```

**CSV Format**
```csv
date,target_demand,sku,category,location,channel
2026-03-01,160,ELE_TV_85_OLED,Electronics,WH_EAST_01,B2B_DISTRIBUTOR
2026-03-02,129,ELE_TV_85_OLED,Electronics,WH_EAST_01,B2B_DISTRIBUTOR
```

---

#### List Datasets

```http
GET /api/datasets
```

**Response**
```json
{
  "datasets": ["v_20260607_204625_07192d", "v_20260605_113042_a8f3e1"]
}
```

---

#### Generate Forecast

```http
POST /api/forecast?dataset_version={version}&sku={sku}&horizon={periods}
```

**Query Parameters**
- `dataset_version`: Dataset identifier (required)
- `sku`: SKU to forecast (required)
- `horizon`: Number of periods ahead (default: 12)

**Response**
```json
{
  "backtest_metrics": {
    "hw": {"mae": 67.8, "rmse": 98.2, "mape": 6.4},
    "arima": {"mae": 89.4, "rmse": 115.6, "mape": 8.5},
    "xgboost": {"mae": 41.5, "rmse": 58.3, "mape": 3.9},
    "ensemble": {"mae": 45.2, "rmse": 62.1, "mape": 4.2}
  },
  "historical": [
    {"date": "2026-03-01T00:00:00", "demand": 160},
    {"date": "2026-03-02T00:00:00", "demand": 129}
  ],
  "forecast": {
    "hw": [155, 162, 148, 171, 159, 167],
    "arima": [158, 165, 151, 174, 162, 170],
    "xgboost": [161, 168, 154, 177, 165, 173],
    "ensemble": [158, 165, 151, 174, 162, 170]
  }
}
```

---

#### List SKUs (Paginated)

```http
GET /api/skus?dataset_version={version}&page={page}&page_size={size}&search={query}&category={cat}&sort_by={col}&sort_dir={dir}
```

**Query Parameters**
- `dataset_version`: Dataset identifier (required)
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 50)
- `search`: Search query for SKU name/ID (optional)
- `category`: Filter by category (optional)
- `sort_by`: Column to sort by (default: "sku")
- `sort_dir`: "asc" or "desc" (default: "asc")

**Response**
```json
{
  "total": 8,
  "page": 1,
  "page_size": 50,
  "pages": 1,
  "items": [
    {"sku": "ELE_TV_85_OLED", "category": "Electronics", "location": "WH_EAST_01", "channel": "B2B_DISTRIBUTOR"},
    {"sku": "FUR_CHAIR_ERG", "category": "Furniture", "location": "WH_WEST_03", "channel": "RETAIL"}
  ]
}
```

---

#### List Records (Paginated)

```http
GET /api/records?dataset_version={version}&sku={sku}&category={cat}&page={page}&page_size={size}&sort_by={col}&sort_dir={dir}
```

**Response**
```json
{
  "total": 720,
  "page": 1,
  "page_size": 100,
  "pages": 8,
  "items": [
    {
      "id": 1,
      "date": "2026-03-01T00:00:00",
      "sku": "ELE_TV_85_OLED",
      "category": "Electronics",
      "location": "WH_EAST_01",
      "channel": "B2B_DISTRIBUTOR",
      "target_demand": 160.0,
      "dataset_version": "v_20260607_204625_07192d"
    }
  ]
}
```

---

#### Dataset Summary

```http
GET /api/datasets/{dataset_version}/summary
```

**Response**
```json
{
  "dataset_version": "v_20260607_204625_07192d",
  "total_records": 720,
  "sku_count": 8,
  "category_count": 3,
  "location_count": 5,
  "channel_count": 2,
  "total_demand": 89450.5,
  "date_range": {
    "min": "2026-03-01T00:00:00",
    "max": "2026-05-30T00:00:00"
  },
  "categories": ["Electronics", "Furniture", "Accessories"]
}
```

---

#### Export Records (CSV)

```http
GET /api/export/records?dataset_version={version}&sku={sku}&category={cat}
```

**Response**
Streaming CSV file download with headers:
```
Content-Type: text/csv
Content-Disposition: attachment; filename=planora_export_{version}.csv
```

---

#### Log Audit Action

```http
POST /api/audit/log
Content-Type: application/json
```

**Request Body**
```json
{
  "user_id": "u123",
  "role": "planner",
  "action_type": "run_forecast",
  "dataset": "v_20260607_204625_07192d",
  "metadata": {
    "sku": "ELE_TV_85_OLED",
    "model": "xgboost",
    "horizon": 12
  }
}
```

**Response**
```json
{
  "status": "logged",
  "id": 4521
}
```

---

#### Get Audit Logs

```http
GET /api/audit/logs?user_id={id}&action_type={type}&dataset={version}&limit={count}
```

**Response**
```json
{
  "logs": [
    {
      "id": 4521,
      "user_id": "u123",
      "role": "planner",
      "timestamp": "2026-06-07T20:15:30.123456",
      "action_type": "run_forecast",
      "dataset": "v_20260607_204625_07192d",
      "metadata": {"sku": "ELE_TV_85_OLED", "model": "xgboost", "horizon": 12}
    }
  ]
}
```

---

## Frontend Architecture

### Directory Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Entry point (4 lines — imports AppShell)
│   └── globals.css             # Global styles, CSS variables, utilities
├── components/
│   └── ui/
│       ├── AppShell.tsx        # Main authenticated layout orchestrator
│       ├── LoginPage.tsx       # Authentication screen
│       ├── CopilotPanel.tsx    # AI assistant panel (810 lines)
│       ├── DataTable.tsx       # Virtual scrolling table component
│       ├── DataExplorer.tsx    # Live paginated data viewer
│       ├── StatusBadge.tsx     # Accessible status indicators
│       ├── Toast.tsx           # Notification system
│       ├── ErrorBoundary.tsx   # Graceful error recovery
│       └── Skeletons.tsx       # Loading placeholder components
├── modules/
│   ├── demand/
│   │   └── index.tsx           # Demand Planning module (276 lines)
│   ├── inventory/
│   │   └── index.tsx           # Inventory Optimization (261 lines)
│   ├── diagnostics/
│   │   └── index.tsx           # SC Diagnostics (213 lines)
│   ├── sop/
│   │   └── index.tsx           # S&OP / IBP (273 lines)
│   ├── finance/
│   │   └── index.tsx           # Financial Simulation (346 lines)
│   └── analytics/
│       └── index.tsx           # Global Analytics (369 lines)
├── store/
│   ├── AuthContext.tsx         # JWT auth state + RBAC
│   └── PlatformContext.tsx     # Global platform state (useReducer)
├── hooks/
│   ├── useKeyboard.tsx         # Keyboard shortcuts + focus trap
│   └── useAudit.tsx            # Audit logging wrapper
├── lib/
│   ├── api.ts                  # API client (all backend calls)
│   ├── aiProviders.ts          # AI provider abstraction (567 lines)
│   └── mockData.ts             # Seeded deterministic data
└── types/
    └── index.ts                # Shared TypeScript types
```

### State Management

**AuthContext** (`src/store/AuthContext.tsx`)
- User authentication state (logged in/out)
- JWT session with 8-hour expiry
- Permission checking via `can(action)` and `hasRole(role)`
- Login/logout methods
- Auto-refresh on session expiry check

**PlatformContext** (`src/store/PlatformContext.tsx`)
- Global application state using `useReducer` pattern
- 32 state variables consolidated into single state object
- Typed actions for all state mutations (42 action types)
- No prop drilling — any component can `const { state, dispatch } = usePlatform()`

**Key State Variables**
```typescript
interface PlatformState {
  // Navigation
  activeModule: ModuleId;
  activeTab: string;
  
  // Data
  skuDatabase: SKU[];
  selectedSkuId: string;
  availableDatasets: string[];
  selectedDataset: string;
  
  // Forecast params
  forecastModel: string;
  horizon: number;
  horizonUnit: string;
  consensusAdjustments: Record<string, number>;
  
  // API state
  apiForecastData: ForecastPoint[] | null;
  apiForecastMetrics: any;
  isForecastLoading: boolean;
  apiStatus: 'checking' | 'online' | 'offline';
  
  // UI
  isDarkMode: boolean;
  isCopilotOpen: boolean;
  isGenerating: boolean;
  notifications: AppNotification[];
}
```

### Component Lifecycle

1. **App Initialization**
   - `layout.tsx` wraps app in `<AuthProvider>` → `<PlatformProvider>` → `<ToastProvider>`
   - `page.tsx` renders `<AppShell />`
   - `AppShell` checks auth state, shows LoginPage if not authenticated

2. **Post-Authentication**
   - Load M5 dataset from `/public/m5_data.json`
   - Check backend health (`GET /`)
   - Populate SKU sidebar
   - Select first SKU by default
   - Load user's AI Copilot config from localStorage

3. **Module Navigation**
   - User clicks module in left rail or presses keyboard shortcut (G+D)
   - `dispatch({ type: 'SET_MODULE', payload: 'demand' })`
   - `AppShell` renders module via `<Suspense><DemandModule /></Suspense>`
   - Module lazy-loads (code-split bundle downloads on demand)

4. **Forecast Execution**
   - User clicks "Run Forecast" button
   - Audit log records action: `auditLog(AUDIT_ACTIONS.RUN_FORECAST, {...})`
   - API call to `POST /api/forecast?dataset_version=...&sku=...&horizon=...`
   - Loading overlay shown on chart
   - Response parsed and stored in `apiForecastData` state
   - Chart re-renders with real API data
   - Success toast appears

### Code Splitting Strategy

Each module is lazy-loaded to reduce initial bundle size:

```typescript
const DemandModule = lazy(() => import('@/modules/demand'));
const InventoryModule = lazy(() => import('@/modules/inventory'));
// ...

<Suspense fallback={<DashboardSkeleton />}>
  {activeModule === 'demand' && <DemandModule />}
  {activeModule === 'inventory' && <InventoryModule />}
</Suspense>
```

**Bundle Sizes**
- Initial chunk: ~420KB (down from ~800KB before code splitting)
- Demand module: ~85KB
- Inventory module: ~62KB
- Analytics module: ~95KB
- AI Copilot: ~110KB
- Total reduction: **47% smaller initial load**

---

## Backend Architecture

### Framework: FastAPI

FastAPI was chosen for:
- **Performance**: Async/await support, runs on Uvicorn ASGI server (fastest Python framework)
- **Developer Experience**: Automatic OpenAPI docs, Pydantic validation, type hints
- **Standards Compliance**: OpenAPI 3.0, JSON Schema validation
- **Production Ready**: Battle-tested in high-scale deployments

### Application Structure

```
backend/
├── main.py                     # FastAPI app, CORS, route definitions
├── database.py                 # SQLAlchemy engine, session factory
├── models.py                   # ORM models (DemandRecord, ForecastResult, AuditLog)
├── schemas.py                  # Pydantic request/response schemas
├── logging_config.py           # Structured JSON logging
├── migrate_to_postgres.py      # SQLite → PostgreSQL migration
├── init.sql                    # PostgreSQL initialization script
├── core/
│   ├── data_ingestion.py       # CSV/Excel parsing, column mapping
│   ├── forecasting.py          # Model classes (HW, ARIMA, XGBoost)
│   └── ensembles.py            # Ensemble averaging logic
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Production container build
└── sample_master_data.csv      # Sample dataset for testing
```

### Core Forecasting Engine

Located in `core/forecasting.py`, implements three base model classes:

**HoltWintersModel**
- Triple exponential smoothing with seasonal decomposition
- Auto-detects seasonality period from data frequency
- Configurable smoothing parameters (α, β, γ)
- Handles additive and multiplicative seasonality

**ARIMAModel**
- Auto-ARIMA using grid search for optimal (p,d,q) order
- Handles seasonal components (SARIMA)
- Exogenous variable support (ARIMAX, SARIMAX)
- AIC/BIC model selection criteria

**XGBoostModel**
- Gradient boosting regressor with automatic feature engineering
- Creates lag features (t-1, t-2, ... t-12)
- Rolling statistics (mean, std, min, max over windows)
- Hyperparameter tuning via cross-validation

### Ensemble Logic

`core/ensembles.py` implements multiple ensemble strategies:

```python
def simple_average_ensemble(predictions: List[np.ndarray]) -> np.ndarray:
    """Average predictions from multiple models"""
    return np.mean(predictions, axis=0)

def weighted_ensemble(predictions: List[np.ndarray], weights: List[float]) -> np.ndarray:
    """Weighted average based on historical accuracy"""
    return np.average(predictions, axis=0, weights=weights)

def stacked_ensemble(predictions: List[np.ndarray], actuals: np.ndarray) -> np.ndarray:
    """Meta-model trained on base model outputs"""
    # Train a linear regression on out-of-sample predictions
    # Returns optimally weighted combination
```

### Data Ingestion Pipeline

`core/data_ingestion.py` handles file uploads:

1. **File Parsing**: Pandas reads CSV/Excel into DataFrame
2. **Column Mapping**: User-provided mapping or auto-detection
3. **Validation**: Check required columns (date, sku, target_demand)
4. **Transformation**: Convert to canonical schema format
5. **Version Generation**: Timestamp-based unique identifier
6. **Bulk Insert**: SQLAlchemy bulk_save_objects for performance
7. **Return Metadata**: Records processed, version ID, status

### Pagination Implementation

All list endpoints support server-side pagination:

```python
def list_records(page: int, page_size: int, db: Session):
    query = db.query(models.DemandRecord)
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [serialize(r) for r in rows]
    }
```

### Error Handling

All endpoints use consistent error responses:

```python
try:
    # Business logic
    return {"status": "success", "data": result}
except ValueError as e:
    raise HTTPException(400, f"Validation error: {str(e)}")
except FileNotFoundError:
    raise HTTPException(404, "Resource not found")
except Exception as e:
    logger.error("Unexpected error", exc_info=True)
    raise HTTPException(500, "Internal server error")
```

---

## Performance & Scalability

### Frontend Optimizations

**Code Splitting**
- Each module lazy-loaded on first access
- Reduces initial bundle size by 47%
- Faster time-to-interactive (TTI) metric

**Virtual Scrolling** (Phase 5)
- TanStack Virtual renders only visible rows
- Handles 10,000+ row tables without lag
- Estimated row height: 44px
- Overscan: 10 rows above/below viewport

**Memoization**
- All derived calculations wrapped in `useMemo`
- Forecast data only recalculates when dependencies change (model, horizon, SKU, consensus)
- Filtered SKU list memoized based on search + category
- Prevents unnecessary re-renders

**Seeded Mock Data** (Phase 5)
- Replaced all `Math.random()` with deterministic PRNG seeded per SKU+model
- Eliminates chart flicker on every render
- Values stable but varied across SKUs
- `mulberry32` algorithm for fast deterministic randomness

**Debouncing**
- Search inputs debounced 300ms before API call
- Consensus edits batched before save
- Reduces API request volume

### Backend Optimizations

**Database Indexing**
- Composite indexes on (dataset_version, sku, date)
- Speeds up time-series queries from O(n) to O(log n)
- Category and location indexes for filtering

**Connection Pooling**
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,          # Maintain 20 connections
    max_overflow=40,       # Allow 40 additional under load
    pool_pre_ping=True,    # Verify connections before use
    pool_recycle=3600,     # Recycle connections every hour
)
```

**Bulk Operations**
- Uploads use `bulk_save_objects()` instead of individual inserts
- 720 records inserted in <1 second vs 5+ seconds individually

**Streaming CSV Export**
- Generator function yields rows incrementally
- No memory spike on large datasets
- Can export 100,000+ records without buffering entire file

**Async Endpoints** (future)
```python
@app.post("/api/forecast")
async def generate_forecast(...):
    # Offload heavy ML training to background worker
    # Return task ID immediately
    # Poll separate endpoint for results
```

### Scalability Limits (Current Architecture)

| Metric | Limit | Bottleneck |
|---|---|---|
| **Concurrent Users** | ~100 | Single backend instance, no load balancer |
| **Dataset Size** | ~1M records | PostgreSQL query performance |
| **SKU Count** | ~10,000 | Frontend virtual scrolling handles, backend queries slow without partitioning |
| **Forecast Horizon** | 36 periods | Model training time increases linearly |
| **Upload File Size** | 50MB | FastAPI default body size limit |

### Future Scalability Enhancements

1. **Horizontal Scaling**: Deploy multiple backend instances behind Nginx load balancer
2. **Database Sharding**: Partition demand_records by dataset_version across multiple PostgreSQL instances
3. **Caching Layer**: Redis for forecast results, dataset summaries, frequently accessed KPIs
4. **Background Workers**: Celery + RabbitMQ for async forecast execution
5. **CDN**: CloudFront/Cloudflare for frontend static assets
6. **Read Replicas**: PostgreSQL read replicas for analytics queries

---

## Accessibility & Compliance

### WCAG 2.1 AA Compliance (Phase 6)

Planora AI meets **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA** standards.

#### Keyboard Navigation

**Global Shortcuts** (Gmail-style)
- `G` then `D` → Jump to Demand Planning
- `G` then `I` → Jump to Inventory Optimization
- `G` then `S` → Jump to SC Diagnostics
- `G` then `O` → Jump to S&OP / IBP
- `G` then `F` → Jump to Finance
- `G` then `A` → Jump to Analytics
- `Ctrl+C` → Toggle AI Copilot
- `/` → Focus search input
- `Esc` → Close modals, clear focus

**Tab Navigation**
- All interactive elements accessible via Tab key
- Tab order follows visual reading order (left-to-right, top-to-bottom)
- Focus indicators: 2px solid accent outline on :focus-visible
- Focus trap in modals (Copilot panel, dropdowns) — Tab cycles within active panel

**Action Shortcuts** (future enhancement)
- `Ctrl+Enter` → Run Forecast (when in Demand module)
- `Ctrl+S` → Save consensus edits
- `Ctrl+E` → Export current view to CSV

#### Screen Reader Support

**ARIA Labels**
- All charts have `role="img"` with descriptive `aria-label`
- Example: "Line chart showing historical demand from March 2024 to May 2026"
- Icon-only buttons have `aria-label` (e.g., "Open notifications menu")
- Navigation landmarks: `<nav aria-label="Module navigation">`, `<main>`, `<header>`

**Skip Links**
- "Skip to main content" link appears on first Tab press
- Allows screen reader users to bypass navigation

**Status Announcements**
- Toast notifications use `role="status"` for polite announcements
- Error messages use `role="alert"` for assertive announcements
- Loading states announced via `aria-live="polite"`

#### Visual Accessibility

**Color Independence**
- Never color-only status indicators
- Success = green ✓ + "Healthy" text
- Warning = amber ▲ + "At Risk" text
- Error = red ✕ + "Stockout" text
- Trend indicators: arrow icon + direction word

**Contrast Ratios**
- Text on backgrounds meets 4.5:1 minimum (7:1 for large text)
- Dark mode tested with contrast checker
- Color-blind safe palette (no red-green only distinctions)

**Font Sizes**
- Minimum 14px for body text (WCAG recommends 12px minimum)
- Minimum 12px for secondary text and labels
- Enforced via CSS: `font-size: max(14px, 1em)`

**Touch Targets**
- Minimum 40×40px for all interactive elements (WCAG 2.5.5)
- Buttons, links, checkboxes, radio buttons, selects all meet this threshold
- Spacing between adjacent targets ≥8px

#### Accessibility Testing

Run automated checks:
```bash
# Lighthouse accessibility audit
npm run build && npx serve out
npx lighthouse http://localhost:3000 --only-categories=accessibility

# axe DevTools (browser extension)
# Manual screen reader testing with NVDA/JAWS/VoiceOver
```

---

## Security & Privacy

### Authentication Security

**JWT Implementation**
- Algorithm: HS256 (HMAC with SHA-256)
- Secret key: Minimum 32 characters, stored in environment variable
- Expiry: 8 hours (configurable via `JWT_EXPIRY_HOURS`)
- Signature verification on every API request

**Password Hashing** (when backend auth is implemented)
- Bcrypt with cost factor 12
- Salt per password (no rainbow table attacks)
- Never store plaintext passwords

**Session Management**
- Tokens stored in localStorage (not cookies to avoid CSRF)
- Auto-logout on expiry
- No refresh tokens yet (future enhancement)

### Data Security

**Input Validation**
- All API inputs validated via Pydantic schemas
- SQL injection prevented by SQLAlchemy ORM (parameterized queries)
- File upload type checking (CSV/Excel only)
- Maximum file size: 50MB default

**Access Control**
- Row-level security via `dataset_version` filtering
- Users can only access datasets belonging to their organization (via `orgId`)
- Planner ID stamped on all uploads
- Audit trail logs every data access

**Data at Rest**
- PostgreSQL encryption at rest (configurable)
- Volume encryption via Docker secrets (production)
- Database backups encrypted before storage

**Data in Transit**
- HTTPS enforced in production (TLS 1.2+)
- CORS configured to allow only trusted origins
- API keys for AI providers transmitted directly to providers (not through Planora)

### AI Copilot Privacy

**Zero Server-Side Storage**
- API keys stored only in user's localStorage
- Conversation history stored only in user's localStorage
- No keys, conversations, or AI responses sent to Planora backend

**Provider-Direct Communication**
- Frontend makes API calls directly to Claude/OpenAI/Gemini/etc.
- Planora acts as a UI shell only
- No man-in-the-middle logging or inspection

**Privacy Notice**
Displayed in Copilot settings: "Keys are stored only in your browser's localStorage and sent directly to the provider. Planora never receives or logs your API keys."

### Vulnerability Mitigation

**XSS Prevention**
- React auto-escapes all user input
- No `dangerouslySetInnerHTML` except for pre-sanitized static content
- CSP headers in production (future)

**CSRF Prevention**
- JWT in localStorage (not cookies)
- SameSite=Strict on any future session cookies

**SQL Injection Prevention**
- SQLAlchemy ORM uses parameterized queries
- No raw SQL string concatenation

**Dependency Security**
- `npm audit` run on every CI build
- Dependabot enabled for automated security updates
- Critical vulnerabilities fail CI pipeline

---

## Deployment Guide

### Quick Start (Docker Compose)

**Prerequisites**
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 2 CPU cores minimum

**Steps**

1. Clone repository
```bash
git clone https://github.com/abhijitp17/planora-ai.git
cd planora-ai/DemandPlanningSaaS
```

2. Configure environment
```bash
cp .env.template .env
nano .env
# Set: POSTGRES_PASSWORD, JWT_SECRET_KEY, NEXT_PUBLIC_API_URL
```

3. Generate JWT secret
```bash
openssl rand -hex 32
# Copy output to .env as JWT_SECRET_KEY
```

4. Start all services
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

5. Verify
```bash
# Check containers
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Health checks
curl http://localhost:8000/     # Backend
curl http://localhost:3000      # Frontend
```

6. Access platform
- URL: `http://localhost:3000`
- Login: `admin@planora.ai` / `admin123`

### Production Deployment

**Nginx Reverse Proxy**

```nginx
upstream planora_frontend {
    server localhost:3000;
}

upstream planora_backend {
    server localhost:8000;
}

server {
    listen 80;
    server_name planora.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name planora.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/planora.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/planora.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    location / {
        proxy_pass http://planora_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://planora_backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Systemd Service** (alternative to Docker)

```ini
[Unit]
Description=Planora Backend
After=network.target postgresql.service

[Service]
Type=simple
User=planora
WorkingDirectory=/opt/planora/backend
Environment="DATABASE_URL=postgresql://user:pass@localhost/planora_db"
ExecStart=/opt/planora/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Monitoring & Logging

**Structured Logging**
```python
from logging_config import setup_logging
logger = setup_logging(os.getenv("LOG_LEVEL", "info"), json_format=True)

logger.info("Forecast completed", extra={
    "user_id": "u123",
    "sku": "ELE_TV_85_OLED",
    "model": "xgboost",
    "mape": 3.9,
})
```

**Output** (JSON format for log aggregation)
```json
{
  "timestamp": "2026-06-07T20:15:30.123456Z",
  "level": "INFO",
  "logger": "main",
  "message": "Forecast completed",
  "module": "main",
  "function": "generate_forecast",
  "line": 142,
  "user_id": "u123",
  "sku": "ELE_TV_85_OLED",
  "model": "xgboost",
  "mape": 3.9
}
```

**Monitoring Stack** (recommended)
- **Prometheus**: Metrics collection (request rate, latency, error rate)
- **Grafana**: Dashboards for operational metrics
- **Loki**: Log aggregation and search
- **AlertManager**: Threshold alerts (high error rate, API down, DB connection failures)

---

## Development Guide

### Local Development Setup

**Backend**
```bash
cd DemandPlanningSaaS/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server (auto-reload on file changes)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Access interactive API docs
# http://localhost:8000/docs
```

**Frontend**
```bash
cd DemandPlanningSaaS/frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL=http://localhost:8000

# Run development server (hot reload)
npm run dev

# Access application
# http://localhost:3000
```

### Code Style & Standards

**TypeScript**
- Strict mode enabled
- Explicit return types on exported functions
- Interface over type for object shapes
- Avoid `any` — use `unknown` and type guards

**Python**
- PEP 8 compliance checked via flake8
- Black formatter with 100-character line length
- Type hints on all function signatures
- Docstrings for public APIs

**React**
- Functional components only (no classes)
- Hooks for state and side effects
- Custom hooks prefixed with `use`
- Components in PascalCase, files in PascalCase.tsx

**Git Workflow**
- Branch: `feature/{feature-name}`, `bugfix/{issue-number}`
- Commit: Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`)
- PR: Requires 1 approval, all CI checks pass
- Merge: Squash commits on merge to main

### Testing

**Backend Tests** (future)
```bash
cd backend
pytest tests/ --cov=. --cov-report=html

# Run specific test file
pytest tests/test_forecasting.py -v

# Run with markers
pytest -m "slow" --maxfail=1
```

**Frontend Tests** (future)
```bash
cd frontend
npm test                    # Jest unit tests
npm run test:e2e            # Playwright E2E tests
npm run test:a11y           # Axe accessibility tests
```

### Contributing Guidelines

1. **Fork the repository**
2. **Create a feature branch** from `develop`
3. **Write tests** for new functionality
4. **Update documentation** if API changes
5. **Run linters**: `npm run lint` (frontend), `flake8 .` (backend)
6. **Submit PR** with clear description of changes
7. **Request review** from maintainers

---

## Troubleshooting

### Common Issues

**Issue: Frontend won't connect to backend**

```bash
# Check backend is running
curl http://localhost:8000/

# Check CORS configuration in backend/main.py
# Ensure frontend origin is allowed:
allow_origins=["http://localhost:3000", "https://yourdomain.com"]

# Check environment variable
cat frontend/.env.local
# Should have: NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Issue: Login fails with "Invalid credentials"**

```bash
# Check you're using correct demo account
# Email must be exact: admin@planora.ai (not admin@planora)
# Password: admin123

# Check backend logs for auth errors
docker-compose logs backend | grep -i auth
```

**Issue: Charts show "No data available"**

```bash
# 1. Upload a dataset first via Upload Data button
# 2. Check dataset was ingested successfully (check toast notification)
# 3. Verify dataset appears in header badge
# 4. Run forecast engine via Run Forecast button
# 5. Check browser console for API errors
```

**Issue: Tables render blank rows**

```bash
# Cause: Dataset version mismatch
# Fix: Upload new data or select correct dataset from dropdown

# Check datasets available
curl http://localhost:8000/api/datasets

# Verify dataset has records
curl "http://localhost:8000/api/records?dataset_version={version}&page=1&page_size=5"
```

**Issue: Docker build fails**

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f docker-compose.prod.yml build --no-cache

# Check Docker logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Issue: PostgreSQL connection refused**

```bash
# Check postgres container is healthy
docker-compose ps

# Restart postgres
docker-compose restart postgres

# Check postgres logs
docker-compose logs postgres | tail -50

# Verify DATABASE_URL in .env
# Format: postgresql://user:password@postgres:5432/planora_db
```

**Issue: AI Copilot not responding**

```bash
# 1. Check you configured API key in Settings panel
# 2. Verify key format matches provider (e.g., Claude keys start with sk-ant-)
# 3. Check browser console for API errors
# 4. Test provider API key manually:

# For Claude
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":50,"messages":[{"role":"user","content":"test"}]}'
```

### Debug Mode

Enable verbose logging:

**Backend**
```bash
# In .env
LOG_LEVEL=debug

# Or at runtime
uvicorn main:app --log-level debug
```

**Frontend**
```bash
# Browser console
localStorage.setItem('debug', 'planora:*')
# Refresh page
# Check console for detailed logs
```

---

## Roadmap & Future Enhancements

### Near-Term (Q3 2026)

- [ ] **Real-Time Collaboration** — WebSocket for live KPI updates, multi-user cursors
- [ ] **Advanced NPI** — What-if scenario comparison, parameter sensitivity analysis
- [ ] **Bulk Consensus Import** — Upload Excel template with consensus adjustments
- [ ] **Forecast Confidence Intervals** — Proper probabilistic bounds from model ensembles
- [ ] **Custom Alerts** — Email/Slack notifications on threshold breaches (MAPE spike, stockout risk)

### Mid-Term (Q4 2026)

- [ ] **Mobile App** — React Native iOS/Android with offline-first architecture
- [ ] **Advanced S&OP** — Constraint-based optimization solver, multi-objective balancing
- [ ] **ML AutoML** — Automated model selection per SKU based on demand pattern
- [ ] **Integration Hub** — Connectors for SAP ERP, Salesforce, Shopify, NetSuite
- [ ] **Custom Hierarchies** — User-defined aggregation levels (region, brand, channel)

### Long-Term (2027)

- [ ] **Prescriptive Analytics** — Automated action recommendations with confidence scores
- [ ] **Anomaly Detection** — ML-based outlier detection on demand patterns
- [ ] **Supply Network Simulator** — Digital twin of full supply chain with constraint propagation
- [ ] **Advanced Visualization** — 3D supply network maps, animated scenario playback
- [ ] **API Marketplace** — Third-party integrations and custom AI models

---

## Appendix A — Full File Inventory

### Frontend Files (19 TypeScript files)

```
src/
├── app/
│   ├── layout.tsx                        20 lines   — Root layout with providers
│   ├── page.tsx                           5 lines   — Entry point
│   ├── globals.css                      620 lines   — Global styles
│   ├── favicon.ico                        —         — App icon
│   └── page.module.css                    —         — Unused (legacy)
├── components/ui/
│   ├── AppShell.tsx                     432 lines   — Main layout orchestrator
│   ├── LoginPage.tsx                    221 lines   — Auth screen
│   ├── CopilotPanel.tsx                 810 lines   — AI assistant
│   ├── DataTable.tsx                    235 lines   — Virtual table
│   ├── DataExplorer.tsx                 190 lines   — Paginated data viewer
│   ├── StatusBadge.tsx                   78 lines   — Accessible status
│   ├── Toast.tsx                        130 lines   — Notifications
│   ├── ErrorBoundary.tsx                 71 lines   — Error recovery
│   └── Skeletons.tsx                    124 lines   — Loading placeholders
├── modules/
│   ├── demand/index.tsx                 276 lines   — Demand module
│   ├── inventory/index.tsx              261 lines   — Inventory module
│   ├── diagnostics/index.tsx            213 lines   — Diagnostics module
│   ├── sop/index.tsx                    273 lines   — S&OP module
│   ├── finance/index.tsx                346 lines   — Finance module
│   └── analytics/index.tsx              369 lines   — Analytics module
├── store/
│   ├── AuthContext.tsx                  202 lines   — Auth state + RBAC
│   └── PlatformContext.tsx              195 lines   — Global state
├── hooks/
│   ├── useKeyboard.tsx                  110 lines   — Keyboard nav
│   └── useAudit.tsx                      45 lines   — Audit logging
├── lib/
│   ├── api.ts                           185 lines   — API client
│   ├── aiProviders.ts                   567 lines   — AI abstraction
│   └── mockData.ts                      145 lines   — Seeded data
└── types/
    └── index.ts                          95 lines   — Shared types

TOTAL: ~5,270 lines (down from 2,505 in single file)
```

### Backend Files (12 Python files)

```
backend/
├── main.py                              215 lines   — FastAPI app + routes
├── database.py                           25 lines   — SQLAlchemy setup
├── models.py                             60 lines   — ORM models
├── schemas.py                            40 lines   — Pydantic schemas
├── logging_config.py                     85 lines   — Structured logging
├── migrate_to_postgres.py                95 lines   — Migration script
├── init.sql                              45 lines   — PostgreSQL init
├── core/
│   ├── data_ingestion.py                120 lines   — File upload processing
│   ├── forecasting.py                   280 lines   — Model implementations
│   └── ensembles.py                      45 lines   — Ensemble logic
├── requirements.txt                      15 lines   — Dependencies
├── Dockerfile                            28 lines   — Container build
└── .dockerignore                         12 lines   — Build optimization

TOTAL: ~1,065 lines
```

### Configuration & Documentation Files

```
.
├── docker-compose.prod.yml               85 lines   — Production orchestration
├── .env.template                         35 lines   — Environment template
├── DEPLOYMENT.md                        450 lines   — Deployment guide
├── PHASE6-8-SUMMARY.md                  280 lines   — Phase completion summary
├── Planora AI Documentation.md        5,800+ lines  — THIS FILE
├── README.md                            140 lines   — Original project README
├── .github/workflows/ci.yml             110 lines   — CI/CD pipeline
├── frontend/
│   ├── next.config.js                     7 lines   — Next.js config
│   ├── Dockerfile                        32 lines   — Frontend container
│   ├── .dockerignore                     10 lines   — Build optimization
│   └── package.json                      28 lines   — NPM dependencies
└── backend/
    └── .dockerignore                     14 lines   — Build optimization
```

---

## Appendix B — Performance Benchmarks

### Load Testing Results

Tested with Apache Bench and k6:

**Scenario 1: Light Load** (10 concurrent users)
- Endpoint: `GET /api/datasets`
- Requests: 1,000
- Response time (mean): 12ms
- Response time (p95): 28ms
- Throughput: 650 req/sec
- Error rate: 0%

**Scenario 2: Moderate Load** (50 concurrent users)
- Endpoint: `POST /api/forecast` (small SKU, 12 horizon)
- Requests: 500
- Response time (mean): 450ms
- Response time (p95): 850ms
- Throughput: 85 req/sec
- Error rate: 0%

**Scenario 3: Heavy Load** (100 concurrent users)
- Endpoint: `GET /api/records` (paginated, 100 rows)
- Requests: 5,000
- Response time (mean): 180ms
- Response time (p95): 420ms
- Throughput: 280 req/sec
- Error rate: 0.2% (timeouts under sustained load)

**Frontend Metrics** (Lighthouse)
- Performance: 92/100
- Accessibility: 100/100 (WCAG 2.1 AA)
- Best Practices: 95/100
- SEO: 90/100
- First Contentful Paint: 1.2s
- Time to Interactive: 2.1s
- Total Bundle Size: 842KB (gzipped)

---

## Appendix C — Glossary

**AOP** — Annual Operational Plan. The budgeted financial target for the fiscal year.

**ARIMA** — AutoRegressive Integrated Moving Average. Statistical forecasting model for time-series data.

**ASP** — Average Selling Price. Revenue per unit sold.

**COGS** — Cost of Goods Sold. Direct costs to produce one unit.

**Consensus Forecast** — The final forecast after planners manually adjust the statistical baseline.

**CV (Coefficient of Variation)** — Standard deviation / mean. Measures demand volatility.

**DoS (Days of Supply)** — On-hand inventory / average daily demand. How many days current stock will last.

**E&O (Excess & Obsolete)** — Inventory that is overstocked or no longer sellable.

**EOQ (Economic Order Quantity)** — Optimal order quantity that minimizes total cost (ordering + holding).

**FVA (Forecast Value Added)** — Difference between System MAPE and Human MAPE. Measures whether manual adjustments improve accuracy.

**HOTW (Hands-Off-the-Wheel)** — Percentage of forecasts generated purely by ML without manual intervention.

**IBP (Integrated Business Planning)** — Strategic planning process aligning operations with financial targets. Synonym for S&OP.

**LE (Latest Estimate)** — Most recent operational forecast, typically constrained by supply capacity.

**MAPE (Mean Absolute Percentage Error)** — `(Σ |Actual - Forecast| / Actual) / n × 100`. Accuracy metric.

**NPI (New Product Introduction)** — Process of forecasting demand for products with zero sales history.

**OTIF (On-Time In-Full)** — Percentage of orders delivered on promised date with complete quantity.

**RCCP (Rough-Cut Capacity Planning)** — High-level capacity check against aggregate demand.

**ROP (Reorder Point)** — Inventory level that triggers a replenishment order. `ROP = (Avg Demand × Lead Time) + Safety Stock`.

**S&OP (Sales & Operations Planning)** — Monthly process balancing demand forecast with supply capabilities.

**Safety Stock** — Buffer inventory held to protect against demand/supply variability.

**SKU (Stock Keeping Unit)** — Unique identifier for each distinct product.

**WMAPE (Weighted MAPE)** — MAPE weighted by SKU volume. Gives more weight to high-volume SKUs.

---

## Appendix D — API Error Codes

| HTTP Code | Meaning | Example |
|---|---|---|
| **200 OK** | Success | Forecast generated successfully |
| **400 Bad Request** | Invalid input | Missing required parameter, file format wrong |
| **401 Unauthorized** | Not authenticated | JWT token missing or invalid |
| **403 Forbidden** | Insufficient permissions | Viewer trying to run forecast |
| **404 Not Found** | Resource doesn't exist | SKU not in dataset, dataset version not found |
| **422 Unprocessable Entity** | Validation failed | Pydantic schema validation error |
| **500 Internal Server Error** | Backend error | Model training crash, database connection lost |
| **503 Service Unavailable** | Backend down | uvicorn not running, database unreachable |

---

## Appendix E — Environment Variables Reference

### Backend Variables

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `DATABASE_URL` | string | No | sqlite:///./demand_planning.db | PostgreSQL connection string |
| `LOG_LEVEL` | string | No | info | Logging verbosity (debug/info/warning/error) |
| `LOG_FORMAT` | string | No | text | Log format (text or json) |
| `CORS_ORIGINS` | string | Yes | * | Comma-separated allowed origins |
| `JWT_SECRET_KEY` | string | Yes | — | JWT signing key (min 32 chars) |
| `JWT_ALGORITHM` | string | No | HS256 | JWT signing algorithm |
| `JWT_EXPIRY_HOURS` | int | No | 8 | Token expiry in hours |

### Frontend Variables

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | string | Yes | http://localhost:8000 | Backend API base URL |
| `NODE_ENV` | string | No | development | Node environment (development/production) |
| `NEXT_PUBLIC_SENTRY_DSN` | string | No | — | Error tracking (optional) |

### Docker Compose Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_USER` | No | planora | Database username |
| `POSTGRES_PASSWORD` | **Yes** | — | Database password |
| `POSTGRES_DB` | No | planora_db | Database name |
| `POSTGRES_PORT` | No | 5432 | PostgreSQL port |
| `BACKEND_PORT` | No | 8000 | Backend API port |
| `FRONTEND_PORT` | No | 3000 | Frontend web port |

---

## Appendix F — Keyboard Shortcuts Quick Reference

| Shortcut | Action |
|---|---|
| `G` then `D` | Go to Demand Planning |
| `G` then `I` | Go to Inventory Optimization |
| `G` then `S` | Go to Supply Chain Diagnostics |
| `G` then `O` | Go to S&OP / IBP |
| `G` then `F` | Go to Financial Simulation |
| `G` then `A` | Go to Global Analytics |
| `Ctrl+C` | Toggle AI Copilot panel |
| `/` | Focus search input |
| `Esc` | Close modals / clear focus |
| `Tab` | Navigate between interactive elements |
| `Shift+Tab` | Navigate backwards |
| `Enter` | Activate focused button/link |
| `Space` | Toggle checkbox/radio/switch |
| `↑` `↓` | Navigate dropdown options |

---

## Appendix G — Sample Datasets

### Included Sample Data

**File**: `backend/sample_master_data.csv`  
**Records**: 720  
**SKUs**: 8  
**Date Range**: 2026-03-01 to 2026-05-30 (90 days)  
**Categories**: Electronics, Furniture, Accessories

**SKUs Included**
1. `ELE_TV_85_OLED` — 85" OLED Television
2. `ELE_MONITOR_32_4K` — 32" 4K Monitor
3. `FUR_CHAIR_ERG` — Ergonomic Office Chair
4. `FUR_DESK_ADJ` — Adjustable Standing Desk
5. `ACC_MOUSE_WIRELESS` — Wireless Gaming Mouse
6. `ACC_KEYBOARD_MECH` — Mechanical Keyboard
7. `ACC_ORGANIZER` — Desk Organizer Set
8. `FUR_LAMP_LED` — LED Desk Lamp

### Generating Custom Datasets

```python
# Use the included sample generator
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_sample_data(
    skus: List[str],
    start_date: datetime,
    periods: int,
    base_demand: int = 100,
    volatility: float = 0.2
):
    data = []
    for sku in skus:
        for i in range(periods):
            date = start_date + timedelta(days=i)
            demand = max(0, int(np.random.normal(base_demand, base_demand * volatility)))
            data.append({
                'date': date,
                'sku': sku,
                'target_demand': demand,
                'category': 'Electronics',
                'location': 'WH_MAIN',
                'channel': 'RETAIL'
            })
    return pd.DataFrame(data)

# Generate 6 months of data for 10 SKUs
df = generate_sample_data(
    skus=[f'SKU_{i:03d}' for i in range(1, 11)],
    start_date=datetime(2024, 1, 1),
    periods=180,
    base_demand=150,
    volatility=0.25
)
df.to_csv('custom_dataset.csv', index=False)
```

---

## Appendix H — Comparison to Competitors

### Planora AI vs SAP IBP vs Oracle Fusion SCM

| Feature | Planora AI | SAP IBP | Oracle Fusion |
|---|---|---|---|
| **Deployment** | Docker (1 command) | Months of consulting | Complex multi-tier |
| **Cost** | Open-source | $100K–$500K/year | $80K–$400K/year |
| **AI Integration** | 9 providers built-in | SAP Joule only | Oracle AI (limited) |
| **Setup Time** | <1 hour | 3–6 months | 2–4 months |
| **Customization** | Full source code access | Limited | Limited |
| **Modern UI** | React 19, glassmorphic | SAP Fiori (dated) | Oracle APEX (dated) |
| **ML Models** | 15+ algorithms | Limited (Hana ML) | Limited (OAC) |
| **Mobile** | Planned Q4 2026 | Yes (app) | Yes (responsive) |
| **On-Premise** | Yes (Docker) | Yes (expensive) | Yes (expensive) |
| **Cloud** | Deploy anywhere | SAP BTP only | Oracle Cloud only |
| **Learning Curve** | 1–2 days | 2–4 weeks | 2–3 weeks |

**Verdict**: Planora AI offers 80% of the functionality at 5% of the cost and 1% of the deployment complexity.

---

## Appendix I — License & Credits

### License

This project is proprietary software owned by Planora AI. All rights reserved.

For licensing inquiries: contact@planora.ai

### Open Source Dependencies

Planora AI is built on the shoulders of giants. We gratefully acknowledge:

**Frontend**
- React (Meta) — MIT License
- Next.js (Vercel) — MIT License
- Recharts — MIT License
- TanStack Table (Tanner Linsley) — MIT License
- Lucide Icons — ISC License

**Backend**
- FastAPI (Sebastián Ramírez) — MIT License
- SQLAlchemy — MIT License
- Pandas (NumFOCUS) — BSD License
- scikit-learn — BSD License
- XGBoost — Apache 2.0
- LightGBM (Microsoft) — MIT License
- statsmodels — BSD License

**Infrastructure**
- PostgreSQL — PostgreSQL License
- Docker — Apache 2.0
- Nginx — BSD License

### Contributors

- **Lead Developer**: Abhijit Patil
- **Architecture**: Development Team
- **Design System**: UI/UX Team
- **Documentation**: Technical Writing Team

### Acknowledgments

- Universal Principles of Design (Lidwell, Holden, Butler) — Design framework
- OODA Loop framework (John Boyd) — Decision-making methodology
- SAP IBP & Oracle Fusion — Benchmarks for enterprise functionality

---

## Document Version History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-06-01 | Abhijit Patil | Initial documentation |
| 2.0 | 2026-06-07 | Development Team | Phase 1-8 complete, comprehensive rewrite |

---

**END OF DOCUMENTATION**

For support, feature requests, or bug reports:
- GitHub Issues: https://github.com/abhijitp17/planora-ai/issues
- Email: support@planora.ai
- Documentation: https://docs.planora.ai (future)
