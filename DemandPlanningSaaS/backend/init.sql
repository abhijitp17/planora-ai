-- Planora AI — PostgreSQL Database Initialization
-- This file runs automatically when the postgres container starts for the first time

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_demand_records_sku ON demand_records(sku);
CREATE INDEX IF NOT EXISTS idx_demand_records_category ON demand_records(category);
CREATE INDEX IF NOT EXISTS idx_demand_records_date ON demand_records(date);
CREATE INDEX IF NOT EXISTS idx_demand_records_version ON demand_records(dataset_version);

CREATE INDEX IF NOT EXISTS idx_forecast_results_sku ON forecast_results(sku);
CREATE INDEX IF NOT EXISTS idx_forecast_results_model ON forecast_results(model_name);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs("actionType");

-- Add a view for quick analytics
CREATE OR REPLACE VIEW v_demand_summary AS
SELECT
    dataset_version,
    sku,
    category,
    location,
    channel,
    COUNT(*) as record_count,
    SUM(target_demand) as total_demand,
    AVG(target_demand) as avg_demand,
    MIN(date) as start_date,
    MAX(date) as end_date
FROM demand_records
GROUP BY dataset_version, sku, category, location, channel;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO planora;
GRANT SELECT ON v_demand_summary TO planora;
