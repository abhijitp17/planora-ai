# Planora AI — Production Deployment Guide

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Domain name with SSL certificate (for HTTPS)
- Minimum 4GB RAM, 2 CPU cores
- PostgreSQL 16+ (or use included Docker Compose postgres service)

---

## Quick Start — Docker Compose

### 1. Clone and configure

```bash
git clone https://github.com/abhijitp17/planora-ai.git
cd planora-ai/DemandPlanningSaaS
cp .env.template .env
```

Edit `.env` and set:
```bash
POSTGRES_PASSWORD=your-strong-password-here
JWT_SECRET_KEY=$(openssl rand -hex 32)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

### 2. Build and start all services

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

This starts:
- PostgreSQL database (port 5432)
- FastAPI backend (port 8000)
- Next.js frontend (port 3000)

### 3. Verify services

```bash
# Check health
curl http://localhost:8000/
curl http://localhost:3000

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### 4. Access the platform

Open `http://localhost:3000` and sign in with:
- Email: `admin@planora.ai`
- Password: `admin123`

**CRITICAL**: Change the default admin password immediately in production.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_USER` | Yes | planora | Database user |
| `POSTGRES_PASSWORD` | **Yes** | — | Database password (change this!) |
| `POSTGRES_DB` | Yes | planora_db | Database name |
| `JWT_SECRET_KEY` | **Yes** | — | JWT signing key (min 32 chars) |
| `NEXT_PUBLIC_API_URL` | Yes | http://localhost:8000 | Backend API URL |
| `CORS_ORIGINS` | Yes | http://localhost:3000 | Allowed frontend origins |
| `LOG_LEVEL` | No | info | Logging verbosity (debug/info/warning/error) |
| `SENTRY_DSN` | No | — | Error tracking (optional) |

---

## Migration from SQLite to PostgreSQL

If you have existing SQLite data:

```bash
# 1. Export from SQLite
sqlite3 demand_planning.db .dump > dump.sql

# 2. Convert SQLite → PostgreSQL syntax
sed -i 's/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g' dump.sql
sed -i 's/DATETIME/TIMESTAMP/g' dump.sql

# 3. Import to PostgreSQL
docker exec -i planora-postgres psql -U planora -d planora_db < dump.sql
```

Or use the FastAPI upload endpoint to re-ingest CSVs.

---

## Reverse Proxy (Nginx/Caddy) for HTTPS

### Nginx config

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy config (automatic HTTPS)

```
yourdomain.com {
    reverse_proxy localhost:3000
    reverse_proxy /api/* localhost:8000
}
```

---

## Production Checklist

- [ ] Change all default passwords (`admin123`, database password)
- [ ] Generate and set `JWT_SECRET_KEY` (min 32 random chars)
- [ ] Configure HTTPS with valid SSL certificate
- [ ] Set `CORS_ORIGINS` to your actual domain
- [ ] Enable structured logging (`LOG_LEVEL=info`, `LOG_FORMAT=json`)
- [ ] Set up database backups (pg_dump cron job)
- [ ] Configure firewall — only expose ports 80, 443
- [ ] Set resource limits in docker-compose (memory, CPU)
- [ ] Enable error tracking (Sentry DSN)
- [ ] Review and restrict API CORS origins
- [ ] Set up monitoring (Prometheus + Grafana or Datadog)

---

## Troubleshooting

**Backend won't start**
```bash
docker-compose -f docker-compose.prod.yml logs backend
# Common issue: DATABASE_URL malformed or postgres not ready
# Solution: ensure postgres healthcheck passes before backend starts
```

**Frontend build fails**
```bash
# Clear Next.js cache
rm -rf frontend/.next
docker-compose -f docker-compose.prod.yml build --no-cache frontend
```

**Database connection refused**
```bash
# Check postgres is healthy
docker-compose -f docker-compose.prod.yml ps
# Restart if needed
docker-compose -f docker-compose.prod.yml restart postgres
```

---

## Scaling & Performance

**Horizontal scaling** (multiple backend instances):
```yaml
backend:
  deploy:
    replicas: 3
  # Add load balancer (nginx/HAProxy) in front
```

**Database connection pooling**:
```python
# In database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True
)
```

**Redis for session storage** (future):
```bash
docker-compose.yml:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

---

## Support

For issues, check:
- Backend logs: `docker-compose logs backend`
- Frontend logs: `docker-compose logs frontend`
- Database logs: `docker-compose logs postgres`
- GitHub issues: https://github.com/abhijitp17/planora-ai/issues
