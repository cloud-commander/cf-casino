/**
 * @file project-wide constants to avoid magic numbers and ensure consistency.
 */

export const CONFIG = {
  // Financial Defaults
  DEFAULT_BALANCE_CENTS: 100000, // £1,000.00
  MAX_SINGLE_BET_CENTS: 100000, // £1,000.00

  // Betting Engine
  BET_HOLD_EXPIRY_MS: 30000, // 30 seconds
  BET_COOLDOWN_MS: 100, // 100ms between actions per user

  // Game Loop (Roulette)
  ROULETTE_NUMBERS: 37, // 0-36
  ROULETTE_IDLE_MS: 10000, // Time to place bets
  ROULETTE_SPIN_MS: 5000, // Visual spin duration
  ROULETTE_RESULT_MS: 5000, // Time to show winning number

  // Global Governor (Limits)
  GOVERNOR_DAILY_LIMIT: 65000, // Requests per day
  GOVERNOR_MONTHLY_LIMIT: 2000000, // Requests per month
  GOVERNOR_LOCKDOWN_TTL: 3600, // 1 hour lockdown in KV

  // Authentication
  JWT_EXPIRY_SECONDS: 3600, // 1 hour session
  PIN_MIN_LENGTH: 4,
  PIN_MAX_LENGTH: 6,

  // Infrastructure Defaults
  MAINTENANCE_CRON_SCHEDULE: "0 3 * * *", // 3 AM daily
  ALLOWED_ORIGINS: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://casino.cfdemo.link",
  ],
};
