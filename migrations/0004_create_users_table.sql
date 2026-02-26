-- migrations/0004_create_users_table.sql

-- Persistent User Storage
CREATE TABLE IF NOT EXISTS CASINO_USERS (
    user_id TEXT PRIMARY KEY,
    balance_cents INTEGER NOT NULL DEFAULT 100000,
    currency TEXT NOT NULL DEFAULT 'GBP',
    last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for analytics and listing if needed
CREATE INDEX idx_users_created ON CASINO_USERS(created_at);
