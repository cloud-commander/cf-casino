import { Env } from "../worker";
import {
  LoginRequestSchema,
  ApiResponse,
  ErrorCode,
  QueueMessage,
} from "@shared/types";
import { signJwt } from "./jwt";
import { CONFIG } from "@shared/constants";
import { createApiResponse, createErrorResponse } from "../utils/response";
import { verifyTurnstile } from "../utils/security";

export async function handleLogin(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = LoginRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issueMsgs = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Invalid payload: ${issueMsgs}`,
        400,
        crypto.randomUUID(),
      );
    }

    const { userId, pin, requestId, cfTurnstileResponse } = parsed.data;

    // ------------------------------------------
    // TURNSTILE VERIFICATION (§4.0)
    // ------------------------------------------
    if (env.ENVIRONMENT === "production") {
      const isHuman = await verifyTurnstile(
        env.TURNSTILE_SECRET_KEY,
        cfTurnstileResponse,
        request.headers.get("CF-Connecting-IP") || undefined,
      );

      if (!isHuman) {
        return createErrorResponse(
          ErrorCode.AUTH_REQUIRED,
          "Bot detection failed. Please refresh and try again.",
          403,
          requestId,
        );
      }
    }

    // PIN length check using centralized constants
    if (pin.length < CONFIG.PIN_MIN_LENGTH) {
      return createErrorResponse(
        ErrorCode.AUTH_REQUIRED,
        "Invalid PIN",
        401,
        requestId,
      );
    }

    // ------------------------------------------
    // D1 PERSISTENCE FETCH
    // ------------------------------------------
    let user = await env.DB.prepare(
      "SELECT user_id, balance_cents FROM CASINO_USERS WHERE user_id = ?",
    )
      .bind(userId)
      .first<{ user_id: string; balance_cents: number }>();

    if (!user) {
      // Create new user with default balance
      await env.DB.prepare(
        "INSERT INTO CASINO_USERS (user_id, balance_cents) VALUES (?, ?)",
      )
        .bind(userId, CONFIG.DEFAULT_BALANCE_CENTS)
        .run();
      user = { user_id: userId, balance_cents: CONFIG.DEFAULT_BALANCE_CENTS };
    } else {
      ctx.waitUntil(
        env.DB.prepare(
          "UPDATE CASINO_USERS SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        )
          .bind(userId)
          .run(),
      );
    }

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + CONFIG.JWT_EXPIRY_SECONDS;
    const sessionId = crypto.randomUUID();

    const token = await signJwt(
      { userId, sessionId, iat, exp },
      env.JWT_SECRET,
    );
    const cookie = `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${CONFIG.JWT_EXPIRY_SECONDS}; Path=/`;

    const auditMessage: QueueMessage = {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      userId: userId,
      action: "LOGIN",
      metadata: {
        sourceIp: request.headers.get("CF-Connecting-IP") || "local_host",
      },
    };

    ctx.waitUntil(env.AUDIT_QUEUE.send(auditMessage));

    // Refactor success response to use createApiResponse
    const data = {
      userId,
      expiresIn: CONFIG.JWT_EXPIRY_SECONDS,
      balance: user.balance_cents,
    };

    const response = createApiResponse(data, requestId);
    // Inject cookie into shared response
    response.headers.append("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error(`Login error: ${error}`);
    return createErrorResponse(
      ErrorCode.INVALID_REQUEST,
      "Login failed. Please check payload or database availability.",
      400,
    );
  }
}
