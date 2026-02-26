import { Env } from "../worker";
import {
  ErrorCode,
  BetAuthorizeRequestSchema,
  BetConfirmRequestSchema,
  SessionPayload,
} from "@shared/types";
import { createErrorResponse } from "../utils/response";

export async function handleBetAuthorize(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  auth: SessionPayload,
  locationHint?: string,
): Promise<Response> {
  const reqId = crypto.randomUUID(); // Fallback ID

  try {
    const body = await request.json();
    const parsed = BetAuthorizeRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issueMsgs = parsed.error.issues.map((i) => i.message).join(", ");
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Invalid bet parameters: ${issueMsgs}`,
        400,
        reqId,
      );
    }

    const { requestId, amount, matchId } = parsed.data;

    // Shard by userId
    const ledgerId = env.BETTING_LEDGER.idFromName(auth.userId);
    const ledgerStub = env.BETTING_LEDGER.get(ledgerId, {
      locationHint: locationHint as DurableObjectLocationHint,
    });

    // Forward to DO
    const response = await ledgerStub.fetch(
      new Request("http://ledger/authorize", {
        method: "POST",
        body: JSON.stringify(parsed.data),
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Audit pipeline async
    if (response.ok) {
      ctx.waitUntil(
        env.AUDIT_QUEUE.send({
          requestId,
          timestamp: Date.now(),
          userId: auth.userId,
          action: "BET_AUTHORIZE",
          metadata: { amount, matchId },
        }),
      );
    }

    return response;
  } catch (e) {
    return createErrorResponse(
      ErrorCode.SERVICE_UNAVAILABLE,
      "Betting engine temporarily unavailable",
      503,
      reqId,
    );
  }
}

export async function handleBetConfirm(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  auth: SessionPayload,
  locationHint?: string,
): Promise<Response> {
  const reqId = crypto.randomUUID(); // Fallback ID

  try {
    const body = await request.json();
    const parsed = BetConfirmRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issueMsgs = parsed.error.issues.map((i) => i.message).join(", ");
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Invalid confirmation parameters: ${issueMsgs}`,
        400,
        reqId,
      );
    }

    const { requestId, holdId } = parsed.data;

    const ledgerId = env.BETTING_LEDGER.idFromName(auth.userId);
    const ledgerStub = env.BETTING_LEDGER.get(ledgerId, {
      locationHint: locationHint as DurableObjectLocationHint,
    });

    // Forward to DO
    const response = await ledgerStub.fetch(
      new Request("http://ledger/confirm", {
        method: "POST",
        body: JSON.stringify(parsed.data),
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Audit pipeline async
    if (response.ok) {
      ctx.waitUntil(
        env.AUDIT_QUEUE.send({
          requestId,
          timestamp: Date.now(),
          userId: auth.userId,
          action: "BET_CONFIRM",
          metadata: { holdId },
        }),
      );
    }

    return response;
  } catch (e) {
    return createErrorResponse(
      ErrorCode.SERVICE_UNAVAILABLE,
      "Betting engine temporarily unavailable",
      503,
      reqId,
    );
  }
}
