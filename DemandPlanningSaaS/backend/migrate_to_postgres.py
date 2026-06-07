#!/usr/bin/env python3
"""
SQLite → PostgreSQL migration script — Phase 8
Run: python migrate_to_postgres.py
"""
import sqlite3
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from database import Base

SQLITE_PATH = "./demand_planning.db"
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://planora:password@localhost:5432/planora_db")

def migrate():
    if not os.path.exists(SQLITE_PATH):
        print(f"❌ SQLite database not found: {SQLITE_PATH}")
        return

    print("🔄 Starting migration from SQLite → PostgreSQL...")
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    
    # Connect to PostgreSQL
    pg_engine = create_engine(POSTGRES_URL)
    Base.metadata.create_all(bind=pg_engine)
    Session = sessionmaker(bind=pg_engine)
    pg_session = Session()
    
    try:
        # Migrate demand_records
        cursor = sqlite_conn.execute("SELECT * FROM demand_records")
        rows = cursor.fetchall()
        print(f"  Migrating {len(rows)} demand records...")
        for row in rows:
            record = models.DemandRecord(
                id=row['id'], date=row['date'], target_demand=row['target_demand'],
                sku=row['sku'], category=row['category'], location=row['location'],
                channel=row['channel'], planner_id=row['planner_id'],
                dataset_version=row['dataset_version'],
                hierarchy_levels=row.get('hierarchy_levels'),
                exogenous_variables=row.get('exogenous_variables'),
            )
            pg_session.add(record)
        pg_session.commit()
        print(f"  ✅ demand_records migrated")

        # Migrate forecast_results
        cursor = sqlite_conn.execute("SELECT * FROM forecast_results")
        rows = cursor.fetchall()
        if rows:
            print(f"  Migrating {len(rows)} forecast results...")
            for row in rows:
                result = models.ForecastResult(
                    id=row['id'], date=row['date'], forecast_demand=row['forecast_demand'],
                    sku=row['sku'], model_name=row['model_name'],
                    ensemble_strategy=row.get('ensemble_strategy'),
                    horizon=row['horizon'], dataset_version=row['dataset_version'],
                )
                pg_session.add(result)
            pg_session.commit()
            print(f"  ✅ forecast_results migrated")

        # Migrate audit_logs
        cursor = sqlite_conn.execute("SELECT * FROM audit_logs")
        rows = cursor.fetchall()
        if rows:
            print(f"  Migrating {len(rows)} audit logs...")
            for row in rows:
                log = models.AuditLog(
                    id=row['id'], user_id=row['user_id'], role=row['role'],
                    timestamp=row['timestamp'], actionType=row['actionType'],
                    dataset=row.get('dataset'), metadata_json=row.get('metadata_json'),
                )
                pg_session.add(log)
            pg_session.commit()
            print(f"  ✅ audit_logs migrated")

        print("\n✅ Migration complete!")
        print(f"   Total records: {pg_session.query(models.DemandRecord).count()}")
        
    except Exception as e:
        pg_session.rollback()
        print(f"❌ Migration failed: {e}")
    finally:
        sqlite_conn.close()
        pg_session.close()

if __name__ == "__main__":
    migrate()
