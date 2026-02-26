import { ApiResponse, ErrorCode, QueueMessage } from "@shared/types";
import { handleLogin } from "./auth/login";
import { handleBetAuthorize, handleBetConfirm } from "./api/betting";
import { checkGovernor } from "./middleware/governor";
import { authenticateRequest } from "./middleware/auth";
import { handleAuditQueue } from "./compliance/consumer";
import { handleScheduledPruning } from "./maintenance/pruning";
import { handleAudioToken } from "./api/audio";

import { CONFIG } from "@shared/constants";
import { createApiResponse, createErrorResponse } from "./utils/response";

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";

  // Echo the origin if it matches our allowed list, otherwise use the first one
  // Note: For credentials 'include', we cannot use '*' and must match exactly.
  const isAllowed = CONFIG.ALLOWED_ORIGINS.includes(origin);
  const allowedOrigin = isAllowed ? origin : CONFIG.ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

// Durable Object Exports
export { GlobalGovernor } from "./governor/GlobalGovernor";
export { BettingLedger } from "./engine/BettingLedger";
export { RouletteTable } from "./engine/RouletteTable";
export { LatencyComparator } from "./engine/LatencyComparator";

export interface Env {
  // Common Config
  ENVIRONMENT: string;
  VERSION: string;

  // Infrastructure Bindings
  GAME_LOBBY: KVNamespace;
  GOVERNOR_KV: KVNamespace;
  DB: D1Database;

  // Durable Objects
  BETTING_LEDGER: DurableObjectNamespace;
  GLOBAL_GOVERNOR: DurableObjectNamespace;
  ROULETTE_TABLE: DurableObjectNamespace;
  LATENCY_COMPARATOR: DurableObjectNamespace;

  // Pipelines
  AUDIT_QUEUE: Queue<QueueMessage>;
  METRICS: AnalyticsEngineDataset;

  // Secrets
  JWT_SECRET: string;
  ROLLBAR_TOKEN: string;
  TURNSTILE_SECRET_KEY: string;
  CF_API_TOKEN: string;
  ACCOUNT_ID: string;
  REALTIME_KIT_APP_ID: string;
}
export default {
  /**
   * Main HTTP Gateway
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);

    // 1. Handle CORS preflight (OPTIONS) immediately at $0 cost — never hits routing logic
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const res = await handleRoute(request, env, ctx);

      // Merge baseline security headers + CORS onto every response
      const headers = new Headers(res.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );

      // Force CORS headers onto the successful or handled-error response
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value as string);
      }

      // Preserve Cloudflare Workers WebSocket extension if present
      const ws = (res as Response & { webSocket?: WebSocket }).webSocket;

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
        ...(ws ? { webSocket: ws } : {}),
      });
    } catch (err: unknown) {
      // 2. GLOBAL CATCH: If the Worker logic crashes, we still return a JSON error
      // with CORS headers so the browser (and USER) can see the real error.
      console.error(`GLOBAL_WORKER_ERROR: ${err}`);

      const errorResponse = createErrorResponse(
        ErrorCode.SERVICE_UNAVAILABLE,
        `Edge Execution Error: ${err instanceof Error ? err.message : "Inconsistent Worker State"}`,
        500,
      );

      const errorHeaders = new Headers(errorResponse.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        errorHeaders.set(key, value as string);
      }

      return new Response(errorResponse.body, {
        status: 500,
        headers: errorHeaders,
      });
    }
  },

  /**
   * Background Compliance Queue Consumer
   */
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    await handleAuditQueue(batch as MessageBatch<QueueMessage>, env);
  },

  /**
   * Daily Maintenance Cron
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleScheduledPruning(env));
  },
} satisfies ExportedHandler<Env>;

async function handleRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);

  // 1. Global Governor (L1 Hard Ceiling)
  const lockdownResponse = await checkGovernor(request, env, ctx);
  if (lockdownResponse) return lockdownResponse;

  // 2. Public Routes
  if (url.pathname === "/health") {
    return createApiResponse({ status: "ok", env: env.ENVIRONMENT });
  }

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    return handleLogin(request, env, ctx);
  }

  // 3. Protected Routes
  if (
    url.pathname.startsWith("/api/data/") ||
    url.pathname.startsWith("/api/ws/")
  ) {
    const { auth, errorResponse } = await authenticateRequest(request, env);
    if (errorResponse) return errorResponse;
    if (!auth) return errorResponse!;

    // ------------------------------------------
    // 4. REGIONAL MAPPING (§4.1 UK/EU Mandate)
    // ------------------------------------------
    const locationHint = env.ENVIRONMENT === "production" ? "weur" : undefined;

    // Betting APIs
    if (
      url.pathname === "/api/data/bet/authorize" &&
      request.method === "POST"
    ) {
      return handleBetAuthorize(request, env, ctx, auth, locationHint);
    }
    if (url.pathname === "/api/data/bet/confirm" && request.method === "POST") {
      return handleBetConfirm(request, env, ctx, auth, locationHint);
    }

    // WebSocket Game Loop Upgrade
    if (url.pathname === "/api/ws/roulette") {
      const tableId = env.ROULETTE_TABLE.idFromName("main-table");
      const tableStub = env.ROULETTE_TABLE.get(tableId, {
        locationHint: locationHint as DurableObjectLocationHint,
      });
      return tableStub.fetch(request);
    }

    // RealtimeKit Audio Token Broker
    if (url.pathname === "/api/ws/audio/token" && request.method === "POST") {
      return handleAudioToken(request, env, auth);
    }

    // Latency Comparator
    if (
      url.pathname === "/api/data/latency/bench" &&
      request.method === "POST"
    ) {
      const compId = env.LATENCY_COMPARATOR.idFromName("global-timer");
      const compStub = env.LATENCY_COMPARATOR.get(compId);
      return compStub.fetch(request);
    }

    // Profile test endpoint
    if (url.pathname === "/api/data/user/profile") {
      return createApiResponse({
        userId: auth.userId,
        sessionId: auth.sessionId,
      });
    }
  }

  return createErrorResponse(
    ErrorCode.INVALID_REQUEST,
    "Endpoint not found",
    404,
  );
}
