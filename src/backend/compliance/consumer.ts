import { Env } from "../worker";
import { QueueMessage } from "@shared/types";
import { Logger } from "../utils/logger";

export async function handleAuditQueue(
  batch: MessageBatch<QueueMessage>,
  env: Env,
): Promise<void> {
  const logs = batch.messages.map((m) => m.body);

  if (logs.length === 0) return;

  const logger = new Logger(env);

  try {
    const auditStatements: D1PreparedStatement[] = [];

    // 1. Prepare Audit Log Inserts
    const placeholders = logs.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const auditInsertStmt = env.DB.prepare(`
      INSERT INTO CASINO_AUDIT_LOGS (
        request_id, user_id, action_type, country, payload, created_at
      ) VALUES ${placeholders}
    `);

    const params: (string | number | null)[] = [];
    logs.forEach((log) => {
      params.push(
        log.requestId,
        log.userId,
        log.action,
        log.geoIdx || null,
        JSON.stringify(log.metadata),
        new Date(log.timestamp).toISOString(),
      );
    });
    auditStatements.push(auditInsertStmt.bind(...params));

    // 2. Prepare Balance Updates (D1 Settlement)
    for (const log of logs) {
      if (log.action === "BET_AUTHORIZE" && log.amount) {
        auditStatements.push(
          env.DB.prepare(
            "UPDATE CASINO_USERS SET balance_cents = balance_cents - ? WHERE user_id = ?",
          ).bind(log.amount, log.userId),
        );
      } else if (log.action === "BET_ROLLBACK" && log.amount) {
        auditStatements.push(
          env.DB.prepare(
            "UPDATE CASINO_USERS SET balance_cents = balance_cents + ? WHERE user_id = ?",
          ).bind(log.amount, log.userId),
        );
      }
    }

    // Execute everything in a single atomic transaction
    await env.DB.batch(auditStatements);

    logger.info(
      `Successfully committed batch of ${logs.length} logs and ${auditStatements.length - 1} balance updates to D1.`,
      {
        subsystem: "Compliance",
        count: logs.length,
      },
    );
  } catch (e: unknown) {
    const error = e as Error;
    logger.error("Audit Batch failed. Routing to DLQ table...", error, {
      subsystem: "Compliance",
    });

    try {
      const dlqPlaceholders = logs.map(() => "(?, ?, ?, ?, ?)").join(", ");
      const dlqStmt = env.DB.prepare(`
        INSERT INTO CASINO_DEAD_AUDIT_LOGS (
          request_id, user_id, action_type, failed_reason, retry_count
        ) VALUES ${dlqPlaceholders}
      `);

      const dlqParams: (string | number | null)[] = [];
      logs.forEach((log) => {
        dlqParams.push(
          log.requestId,
          log.userId,
          log.action,
          error.message || "Unknown D1 Error",
          1,
        );
      });

      await dlqStmt.bind(...dlqParams).run();
    } catch (dlqErr) {
      logger.error("DLQ Write Failed. Fatal Data Loss.", dlqErr, {
        subsystem: "Compliance",
      });
    }
  }
}
