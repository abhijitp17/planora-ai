# Planora AI — Backend

FastAPI service for the Planora AI planning platform.

## Local development setup

```bash
cd DemandPlanningSaaS/backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
#    Edit .env — at minimum set JWT_SECRET_KEY (generate with: openssl rand -hex 32).
#    DATABASE_URL defaults to a local SQLite file if unset.

# 3. Create/upgrade the database schema (REQUIRED — the app no longer auto-creates tables)
alembic upgrade head

# 4. Seed the default organization + a first admin user (so you can log in)
SEED_ADMIN_PASSWORD='change-me-now' python -m scripts.seed_default_org \
    --email admin@planora.ai --name 'Admin User'

# 5. Run the API (http://localhost:8000)
uvicorn main:app --reload
```

## Authentication

Auth is server-enforced (JWT bearer tokens). Endpoints live under `/api/auth`:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/login` | Exchange email+password for an access + refresh token pair |
| `POST /api/auth/refresh` | Rotate tokens using a refresh token |
| `GET  /api/auth/me` | Current authenticated user |
| `POST /api/auth/logout` | Client discards tokens (stateless JWT) |
| `POST /api/auth/password-reset/request` | Begin a password reset (token logged pending email transport) |
| `POST /api/auth/password-reset/confirm` | Complete a reset with the token + new password |

- Passwords are hashed with **bcrypt** (used directly — see the note in `requirements.txt`).
- `JWT_SECRET_KEY` **must** be set (no insecure default); tokens fail loudly without it.
- Accounts lock for `LOCKOUT_MINUTES` after `MAX_FAILED_LOGIN_ATTEMPTS` failed logins.
- Server-side RBAC (roles `viewer`/`planner`/`manager`/`admin`) is enforced via
  dependencies in `auth/dependencies.py`, mirroring the frontend permission map.

## Multi-tenancy

Every business table carries an `organization_id`, and isolation is enforced centrally
(no per-endpoint query changes) in `tenant_scoping.py`:

- **Reads** are filtered to the current tenant via a global `with_loader_criteria`
  Session event, keyed off a request-scoped ContextVar set by `get_current_user`.
- **Writes** are auto-stamped with the current tenant on flush; the one bulk-insert
  path (`/api/upload`) stamps explicitly since `bulk_save_objects` bypasses the event.
- Cross-tenant access to a record by id returns **404** (the row is invisible, not
  merely forbidden).

Identity tables (`organizations`, `users`) are intentionally not tenant-filtered — they
are read to establish the tenant in the first place.

## Health endpoints

- `GET /` — liveness (process up; no dependencies checked).
- `GET /health/ready` — readiness (verifies DB connectivity; 503 if the DB is down).

## Testing

```bash
pytest                              # full suite (in-memory SQLite; no external services)
pytest tests/test_tenancy_isolation.py
python -m scripts.check_tenant_stamps   # CI guard: bulk inserts must stamp organization_id
```

Coverage of the foundation:

- `tests/test_auth.py` — login, refresh, `/me`, lockout, password reset.
- `tests/test_rbac.py` — the full 14-action × 4-role permission matrix.
- `tests/test_action_map_parity.py` — backend RBAC map must equal the frontend's.
- `tests/test_auth_coverage.py` — every guarded route returns 401 without a token.
- `tests/test_tenancy_isolation.py` — cross-tenant reads/writes are isolated; cross-tenant get-by-id 404s.
- `tests/math/` — golden-value regression locks on the forecasting/inventory engines
  (change the numbers and these fail — protecting the one genuinely real asset).

CI (`.github/workflows/ci.yml`) runs the tenant-stamp guard, applies/rolls back migrations
from scratch, and runs the full test suite on every push and pull request.

If you start the app against an un-migrated database, it logs a warning
(`Database has no 'alembic_version' table…`) — run `alembic upgrade head`.

## Database & migrations (Alembic)

Alembic is the single source of truth for schema. **Never** hand-edit tables or
rely on `Base.metadata.create_all` — every schema change ships as a reviewed migration.

```bash
alembic upgrade head          # apply all migrations
alembic downgrade -1          # roll back one migration
alembic current               # show the current revision
alembic revision --autogenerate -m "describe change"   # scaffold a new migration
```

- The database URL comes from `database.DATABASE_URL` (env `DATABASE_URL`), so Alembic
  and the app always target the same database — do **not** set `sqlalchemy.url` in
  `alembic.ini`.
- SQLite is for local dev only; production uses PostgreSQL. Migrations use Alembic
  "batch" mode so they apply on SQLite too.

## Configuration

All configuration is environment-driven — see [`.env.example`](.env.example) for the
full list (database, JWT/auth, CORS origins, connection pool sizing, logging). No
secrets or environment-specific values are hardcoded.
