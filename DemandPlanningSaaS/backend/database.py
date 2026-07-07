import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load a local .env file if present (dev convenience). In production, real
# environment variables take precedence — load_dotenv does not override them.
load_dotenv()

# SQLite for zero-setup local development; PostgreSQL in production via DATABASE_URL.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./demand_planning.db")

_IS_SQLITE = DATABASE_URL.startswith("sqlite")

if _IS_SQLITE:
    # SQLite is single-file and doesn't use a real connection pool; check_same_thread
    # is required because FastAPI may touch a session from a different thread.
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # Production databases get an explicit, env-tunable connection pool. pool_pre_ping
    # transparently recycles connections dropped by the DB/proxy, avoiding stale-
    # connection errors after a restart or idle timeout.
    engine = create_engine(
        DATABASE_URL,
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Register global tenant-isolation Session events (read filter + write stamp).
# Imported here, after Base/engine are defined, so the events are active process-wide
# for every ORM Session as soon as the database layer is loaded.
import tenant_scoping  # noqa: E402,F401  (import for its Session-event side effects)
