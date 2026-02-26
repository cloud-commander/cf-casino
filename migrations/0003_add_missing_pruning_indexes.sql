-- migrations/0003_add_missing_pruning_indexes.sql

-- 1. Index for pruning observability logs quickly to avoid full table scans during CRON sweeps
CREATE INDEX IF NOT EXISTS idx_obs_time ON CASINO_OBSERVABILITY_LOGS(created_at);

-- 2. Index for pruning raw metrics quickly to avoid full table scans during CRON sweeps
CREATE INDEX IF NOT EXISTS idx_metrics_time ON CASINO_OBSERVABILITY_METRICS(created_at);
