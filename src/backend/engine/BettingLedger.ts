import { Env } from "../worker";
import { Logger } from "../utils/logger";
import { CONFIG } from "@shared/constants";
import { createApiResponse, createErrorResponse } from "../utils/response";

import {
  ErrorCode,
  BetAuthorizeRequest,
  BetConfirmRequest,
  ApiResponse,
  QueueMessage,
} from "@shared/types";

interface LedgerState {
  balance: number; // in cents
  userId: string; // Injected for compliance auditing
  activeHold: {
    id: string;
    amount: number;
    expiresAt: number;
    status: "PENDING" | "LOCKED";
  } | null;
}

export class BettingLedger implements DurableObject {
  private logger: Logger;

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {
    this.logger = new Logger(this.env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (url.pathname === "/authorize" && method === "POST") {
      return this.handleAuthorize(request);
    }

    if (url.pathname === "/confirm" && method === "POST") {
      return this.handleConfirm(request);
    }

    const reqId = crypto.randomUUID();
    return createErrorResponse(
      ErrorCode.INVALID_REQUEST,
      "Not Found",
      404,
      reqId,
    );
  }

  private async handleAuthorize(request: Request): Promise<Response> {
    const body: BetAuthorizeRequest = await request.json();

    // 1. HYDRATION OUTSIDE TRANSACTION
    // DO storage transactions cannot contain calls to external services like D1.
    let balance = await this.state.storage.get<number>("balance");

    if (balance === undefined) {
      this.logger.debug("DO hydrating from D1", { userId: body.userId });
      const user = await this.env.DB.prepare(
        "SELECT balance_cents FROM CASINO_USERS WHERE user_id = ?",
      )
        .bind(body.userId)
        .first<{ balance_cents: number }>();

      balance = user ? user.balance_cents : CONFIG.DEFAULT_BALANCE_CENTS;
      await this.state.storage.put("balance", balance);
    }

    // 2. ATOMIC BET PLACEMENT
    return await this.state.storage.transaction(async (tx) => {
      let currentBalance = (await tx.get<number>("balance")) ?? balance!;
      let activeHold = await tx.get<LedgerState["activeHold"]>("activeHold");
      let lastActionAt = (await tx.get<number>("lastActionAt")) ?? 0;

      // Ensure userId anchor exists for background persistence
      await tx.put("userId", body.userId);

      // Check for action cooldown
      if (Date.now() - lastActionAt < CONFIG.BET_COOLDOWN_MS) {
        return createErrorResponse(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          "Action cooldown active. Please wait.",
          400,
          body.requestId,
        );
      }
      await tx.put("lastActionAt", Date.now());

      if (activeHold) {
        // Idempotency: Identity retries
        if (activeHold.id === body.requestId) {
          return createApiResponse(
            {
              holdId: activeHold.id,
              balance: currentBalance,
              expiresAt: activeHold.expiresAt,
            },
            body.requestId,
          );
        }
        return createErrorResponse(
          ErrorCode.HOLD_ALREADY_ACTIVE,
          "A hold is already active for this user",
          400,
          body.requestId,
        );
      }

      if (currentBalance < body.amount) {
        return createErrorResponse(
          ErrorCode.INSUFFICIENT_BALANCE,
          `Insufficient balance. Required: ${body.amount}, Available: ${currentBalance}`,
          400,
          body.requestId,
        );
      }

      const expiresAt = Date.now() + CONFIG.BET_HOLD_EXPIRY_MS;
      activeHold = {
        id: body.requestId,
        amount: body.amount,
        expiresAt,
        status: "PENDING",
      };

      currentBalance -= body.amount;

      await tx.put("balance", currentBalance);
      await tx.put("activeHold", activeHold);
      await tx.setAlarm(expiresAt);

      // Audit pipeline async (Fire and forget via Queue)
      const auditMessage: QueueMessage = {
        requestId: body.requestId,
        timestamp: Date.now(),
        userId: body.userId,
        action: "BET_AUTHORIZE",
        amount: body.amount,
        metadata: { holdId: body.requestId, balance: currentBalance },
      };
      await this.env.AUDIT_QUEUE.send(auditMessage);

      return createApiResponse(
        { holdId: activeHold.id, balance: currentBalance, expiresAt },
        body.requestId,
      );
    });
  }

  private async handleConfirm(request: Request): Promise<Response> {
    const body: BetConfirmRequest = await request.json();

    return await this.state.storage.transaction(async (tx) => {
      const activeHold = await tx.get<LedgerState["activeHold"]>("activeHold");
      const balance = (await tx.get<number>("balance")) ?? 0;
      const userId = (await tx.get<string>("userId")) ?? body.userId;

      if (!activeHold || activeHold.id !== body.holdId) {
        return createErrorResponse(
          ErrorCode.HOLD_EXPIRED,
          "Hold not found or already processed",
          400,
          body.requestId,
        );
      }

      activeHold.status = "LOCKED";
      await tx.put("activeHold", activeHold);
      await tx.delete("activeHold");

      // Non-blocking sync to D1
      const auditMessage: QueueMessage = {
        requestId: body.requestId,
        timestamp: Date.now(),
        userId: userId,
        action: "BET_CONFIRM",
        amount: activeHold.amount,
        metadata: { holdId: body.holdId, balance },
      };
      await this.env.AUDIT_QUEUE.send(auditMessage);

      return createApiResponse({ balance }, body.requestId);
    });
  }

  async alarm() {
    await this.state.storage.transaction(async (tx) => {
      const activeHold = await tx.get<LedgerState["activeHold"]>("activeHold");

      if (activeHold && activeHold.status === "PENDING") {
        let balance = (await tx.get<number>("balance")) ?? 0;
        const userId = (await tx.get<string>("userId")) ?? "unknown";

        balance += activeHold.amount;
        await tx.put("balance", balance);
        await tx.delete("activeHold");

        const rollbackMsg: QueueMessage = {
          requestId: crypto.randomUUID(),
          timestamp: Date.now(),
          userId: userId,
          action: "BET_ROLLBACK",
          amount: activeHold.amount,
          metadata: {
            holdId: activeHold.id,
            balance,
            detail: "auto_rollback_expired",
          },
        };

        await this.env.AUDIT_QUEUE.send(rollbackMsg);

        this.logger.info(
          `Rolled back expired hold ${activeHold.id}. Restored ${activeHold.amount} cents.`,
          { subsystem: "Ledger", holdId: activeHold.id },
        );
      }
    });
  }
}
