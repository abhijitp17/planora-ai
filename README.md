# Planora AI

**A planner-native decision-intelligence platform for supply-chain & demand planning.**

Planora AI pairs a genuinely strong forecasting engine (11 statistical models plus
scikit-learn / XGBoost / LightGBM / AutoML, with real backtesting) with inventory,
S&OP, financial, and analytics workspaces — delivered through a modern Next.js cockpit.

> ### 📌 Status & source of truth (read this first)
>
> This project is being built in disciplined phases from a high-fidelity **demo** into a
> production-grade, multi-tenant SaaS. To keep documentation honest, the authoritative
> status of every module and system lives in:
>
> - **[PLANORA_BUILD_CHARTER.md](PLANORA_BUILD_CHARTER.md)** — the Reality Matrix: what is
>   genuinely real (🟢), partial (🟡), or still simulated (🔴), plus the phased roadmap.
> - **[PLANORA_PRD.md](PLANORA_PRD.md)** — product requirements and acceptance criteria per phase.
> - **[PLANORA_STRATEGY_MEMO.md](PLANORA_STRATEGY_MEMO.md)** — product/GTM strategy.
>
> Earlier status documents under `DemandPlanningSaaS/` (the "Documentation", "Session
> Summary", and "Phase" files) are **historical** and overstate completeness — they are
> superseded by the Charter and PRD. Where they conflict, the Charter and the code win.

---

## What is actually real today (honest snapshot)

Planora is **not** yet a finished enterprise product, and this README will not claim it is.
Here is the accurate picture, graded per the Build Charter's Reality Matrix:

| Area | Grade | Reality |
|---|---|---|
| **Forecasting engine** | 🟢 Real | 11 statistical + 6 ML models, AutoML, real MAE/RMSE/MAPE backtesting. The genuine core. |
| **Inventory math** | 🟡 Real algorithms | Safety stock, ROP/EOQ, ABC/XYZ, service-level optimization — real formulas, currently on seeded/uploaded data. |
| **Anomaly detection / clustering / space opt.** | 🟡 | IsolationForest, K-means, SciPy LP — real algorithms. |
| **Platform foundation** (multi-tenancy, auth, RBAC, migrations, tests, CI) | 🟢 **Phase 0 complete** | See below. |
| **S&OP, Finance, Pricing, Retail, Digital Twin, Analytics** | 🟡 | Real math in places, but running on seeded/mock data; not yet productionized. |
| **Supplier Portal, Execution/ERP-WMS-TMS connectors, Self-Service BI** | 🔴 Simulated | UI shells over mock/`hash`/`random` outputs. Kept for demos; **frozen** (not under active development). |

The strategic focus (per the Charter/PRD) is **depth on the Primary loop — Demand → Diagnostics/FVA
→ Inventory → Consensus — on a real, secure, multi-tenant foundation**, before broadening.

---

## ✅ Phase 0 — Foundation (complete)

The platform now has a real, production-grade foundation (replacing the former single-tenant,
unauthenticated prototype):

- **Multi-tenancy** — every business table carries `organization_id`; isolation is enforced
  centrally (SQLAlchemy read-filter + write-stamp), verified by cross-tenant tests. Cross-tenant
  access returns 404.
- **Server-side authentication** — JWT access/refresh tokens, bcrypt password hashing, account
  lockout, password reset; `JWT_SECRET_KEY` has no insecure default.
- **Server-enforced RBAC** — every one of the ~80 API routes requires auth; roles
  (`viewer`/`planner`/`manager`/`admin`) are enforced on the server (the frontend map is UX-only).
- **PostgreSQL + Alembic migrations** — schema is migration-owned; no implicit `create_all`.
- **Tests + CI** — a pytest suite (auth, RBAC, tenancy isolation, and golden-value regression
  locks on the forecasting/inventory math) and a GitHub Actions pipeline gate every change.
- **Observability & secrets hygiene** — structured logging, a `/health/ready` probe,
  `.env.example`, environment-driven CORS.

See **[DemandPlanningSaaS/backend/README.md](DemandPlanningSaaS/backend/README.md)** for the
backend architecture, auth, and testing details.

---

## Architecture

```
Next.js 16 (React 19, TypeScript, Recharts) ── cockpit UI, UX-only RBAC
        │  authenticated REST (Bearer JWT)
        ▼
FastAPI (Python) ── auth + tenant scope on every route
        │  real ML: statsmodels / scikit-learn / xgboost / lightgbm / scipy
        ▼
PostgreSQL (Alembic migrations, org-scoped)   ·   SQLite for local dev
```

- **Frontend** (`DemandPlanningSaaS/frontend`) — Next.js 16, React 19, TypeScript, Recharts,
  TanStack Table/Virtual.
- **Backend** (`DemandPlanningSaaS/backend`) — FastAPI, SQLAlchemy 2.0, Alembic, pandas,
  statsmodels, scikit-learn, XGBoost, LightGBM, SciPy.

---

## Quick start (local development)

**Prerequisites:** Python 3.9+ and Node.js 18+.

### Backend

```bash
cd DemandPlanningSaaS/backend
pip install -r requirements.txt

cp .env.example .env          # set JWT_SECRET_KEY (openssl rand -hex 32)
alembic upgrade head          # create the schema (migrations own it — no auto-create)
SEED_ADMIN_PASSWORD='change-me' python -m scripts.seed_default_org \
    --email admin@planora.ai --name 'Admin User'   # seed default org + first admin

uvicorn main:app --reload     # http://localhost:8000
```

### Frontend

```bash
cd DemandPlanningSaaS/frontend
npm install
npm run dev                    # http://localhost:3000
```

Sign in with the admin you seeded above. (There are no more hardcoded demo accounts —
users live in the database.)

### Tests

```bash
cd DemandPlanningSaaS/backend
pytest
```

---

## Canonical ingestion schema

Upload CSV/Excel demand history mapping to:

| Field | Type | Description |
|---|---|---|
| `date` | DateTime | Period of demand (day/week/month) |
| `target_demand` | Float | Historical actual quantity |
| `sku` | String | Stock Keeping Unit |
| `category` | String | Product line |
| `location` | String | Warehouse / DC / store |
| `channel` | String | Sales channel |
| `exogenous_variables` | JSON | Optional external factors (price, promo, weather) |

---

## Roadmap

Per the Build Charter, development proceeds in phases, each with an exit gate:

- **Phase 0 — Foundation** ✅ *complete* (multi-tenancy, auth, RBAC, migrations, tests, CI).
- **Phase 1 — Real Primary Loop** — harden Demand → FVA → Inventory → Consensus on real
  uploaded data, mock-free, with async batch forecasting and real ingestion.
- **Phase 2 — Productionization** — security hardening, observability, caching, one real integration.
- **Phase 3 — Differentiation** — server-side AI gateway and agentic planning (the moat).
- **Phase 4 — Expansion** — turn 🟡 modules real, in demand order.

See **[PLANORA_BUILD_CHARTER.md](PLANORA_BUILD_CHARTER.md)** §6 for the full roadmap and exit gates.

---

## License

Proprietary. © Planora AI. All rights reserved.
