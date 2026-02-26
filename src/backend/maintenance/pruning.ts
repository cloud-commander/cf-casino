import { Env } from "../worker";
import { Logger } from "../utils/logger";

export async function handleScheduledPruning(env: Env): Promise<void> {
  const logger = new Logger(env);
  logger.info("Starting scheduled pruning...", { subsystem: "Maintenance" });

  try {
    await env.DB.batch([
      // Prune audit logs older than 48 hours (§8.3.5)
      env.DB.prepare(
        "DELETE FROM CASINO_AUDIT_LOGS WHERE created_at < datetime('now', '-48 hours') LIMIT 5000",
      ),

      // Prune observability logs older than 7 days
      env.DB.prepare(
        "DELETE FROM CASINO_OBSERVABILITY_LOGS WHERE created_at < datetime('now', '-7 days') LIMIT 5000",
      ),

      // Prune metrics older than 7 days
      env.DB.prepare(
        "DELETE FROM CASINO_OBSERVABILITY_METRICS WHERE created_at < datetime('now', '-7 days') LIMIT 5000",
      ),
    ]);

    logger.info("Pruning complete.", { subsystem: "Maintenance" });
  } catch (e) {
    logger.error("Pruning failed", e, { subsystem: "Maintenance" });
  }
}
