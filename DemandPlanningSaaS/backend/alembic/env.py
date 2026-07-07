"""Alembic migration environment for Planora AI.

The database URL and target metadata are sourced from the application itself
(``database.DATABASE_URL`` / ``database.Base``) so migrations always run against
the same database the app uses, and ``--autogenerate`` sees the real models.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make the backend package importable (env.py runs from the backend/ dir).
from database import DATABASE_URL, Base

# Import the model modules for their side effect of registering tables on Base.metadata.
# This is what lets `alembic revision --autogenerate` detect schema drift.
import models  # noqa: F401  (business-domain tables)

try:
    # Auth tables (organizations, users) exist from M2 onward; tolerate their
    # absence during M1 so the baseline migration only captures business tables.
    import auth.models  # noqa: F401
except ImportError:
    pass

config = context.config

# Point Alembic at the app's database, overriding any value in alembic.ini.
config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout without a live DB connection (``alembic upgrade --sql``)."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # SQLite cannot ALTER most columns in place; batch mode emits
        # copy-and-replace table rewrites so migrations work on SQLite dev too.
        render_as_batch=DATABASE_URL.startswith("sqlite"),
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=DATABASE_URL.startswith("sqlite"),
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
