-- migrations/0002_update_audit_action_types.sql

PRAGMA foreign_keys=OFF;

-- 1. Create the new table with the updated CHECK constraint
CREATE TABLE IF NOT EXISTS CASINO_AUDIT_LOGS_NEW (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('LOGIN', 'BET_PLACED', 'BET_AUTHORIZE', 'BET_CONFIRM')),
    country TEXT,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Copy the existing data
INSERT INTO CASINO_AUDIT_LOGS_NEW (id, request_id, user_id, action_type, country, payload, created_at)
SELECT id, request_id, user_id, action_type, country, payload, created_at FROM CASINO_AUDIT_LOGS;

-- 3. Drop the old table
DROP TABLE CASINO_AUDIT_LOGS;

-- 4. Rename the new table
ALTER TABLE CASINO_AUDIT_LOGS_NEW RENAME TO CASINO_AUDIT_LOGS;

-- 5. Re-create indexes
CREATE INDEX idx_audit_user ON CASINO_AUDIT_LOGS(user_id);
CREATE INDEX idx_audit_time ON CASINO_AUDIT_LOGS(created_at);

PRAGMA foreign_keys=ON;
