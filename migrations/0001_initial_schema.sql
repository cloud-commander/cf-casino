-- migrations/0001_initial_schema.sql

-- Compliance Table
CREATE TABLE IF NOT EXISTS CASINO_AUDIT_LOGS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('LOGIN', 'BET_PLACED')),
    country TEXT,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_user ON CASINO_AUDIT_LOGS(user_id);
CREATE INDEX idx_audit_time ON CASINO_AUDIT_LOGS(created_at);

-- Dead Letter Storage
CREATE TABLE IF NOT EXISTS CASINO_DEAD_AUDIT_LOGS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL UNIQUE,
    user_id TEXT,
    action_type TEXT,
    failed_reason TEXT,
    retry_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Observability Logs
CREATE TABLE IF NOT EXISTS CASINO_OBSERVABILITY_LOGS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trace_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL CHECK(level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    message TEXT NOT NULL,
    context_json TEXT NOT NULL,
    timing_json TEXT, -- Nullable per remediation KV-E
    result_json TEXT,
    metadata_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_obs_trace ON CASINO_OBSERVABILITY_LOGS(trace_id);

-- Observability Metrics
CREATE TABLE IF NOT EXISTS CASINO_OBSERVABILITY_METRICS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    labels_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_metrics_name ON CASINO_OBSERVABILITY_METRICS(metric_name);
