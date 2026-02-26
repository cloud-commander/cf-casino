import { z } from "zod";

/**
 * @file source-of-truth types for the iGaming Edge POC.
 * All currency is stored as integer CENTS (£1.00 = 100).
 * All odds are stored as integer BASIS POINTS (1.95 = 195).
 */

// ==========================================
// 1. GLOBAL ERROR CODES (§15.1)
// ==========================================

// FIXED: Using const object instead of enum because erasableSyntaxOnly is enabled
export const ErrorCode = {
  // 400 Bad Request
  INVALID_REQUEST: "INVALID_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_CURRENCY: "INVALID_CURRENCY",

  // 401 Unauthorized
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  SESSION_INVALID: "SESSION_INVALID",

  // 403 Forbidden
  USER_BLOCKED: "USER_BLOCKED",
  COUNTRY_RESTRICTED: "COUNTRY_RESTRICTED",

  // 409 Conflict
  HOLD_ALREADY_ACTIVE: "HOLD_ALREADY_ACTIVE",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  HOLD_EXPIRED: "HOLD_EXPIRED",
  MATCH_CLOSED: "MATCH_CLOSED",
  DUPLICATED_REQUEST: "DUPLICATED_REQUEST",

  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  QUOTA_EXHAUSTED: "QUOTA_EXHAUSTED",

  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  QUEUE_BACKPRESSURE: "QUEUE_BACKPRESSURE",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

import { CONFIG } from "./constants";

// ==========================================
// 2. AUTHENTICATION SCHEMAS
// ==========================================

export const LoginRequestSchema = z.object({
  userId: z.string().min(1).max(32),
  pin: z.string().min(CONFIG.PIN_MIN_LENGTH).max(CONFIG.PIN_MAX_LENGTH),
  requestId: z.string().uuid(),
  cfTurnstileResponse: z.string().optional(), // Mandatory in prod, optional for local dev tests
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * HS256 JWT Payload
 */
export const SessionPayloadSchema = z.object({
  userId: z.string(),
  sessionId: z.string().uuid(),
  iat: z.number().int(),
  exp: z.number().int(),
});

export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

// ==========================================
// 3. BETTING ENGINE SCHEMAS
// ==========================================

export const BetAuthorizeRequestSchema = z.object({
  userId: z.string(),
  amount: z.number().int().positive().max(CONFIG.MAX_SINGLE_BET_CENTS),
  matchId: z.string().min(1).max(64),
  requestId: z.string().uuid(),
});

export type BetAuthorizeRequest = z.infer<typeof BetAuthorizeRequestSchema>;

export const BetConfirmRequestSchema = z.object({
  userId: z.string(),
  holdId: z.string().uuid(),
  requestId: z.string().uuid(),
});

export type BetConfirmRequest = z.infer<typeof BetConfirmRequestSchema>;

// ==========================================
// 4. COMPLIANCE & AUDIT SCHEMAS (§9.3)
// ==========================================

export const QueueMessageSchema = z.object({
  requestId: z.string().uuid(),
  timestamp: z.number().int(), // Unix milliseconds
  userId: z.string(),
  geoIdx: z.string().length(2).optional(), // Country code
  action: z.enum([
    "LOGIN",
    "BET_PLACED",
    "BET_AUTHORIZE",
    "BET_CONFIRM",
    "BET_ROLLBACK",
  ]),
  amount: z.number().int().optional(), // Cents
  metadata: z.record(z.string(), z.unknown()),
});

export type QueueMessage = z.infer<typeof QueueMessageSchema>;

// ==========================================
// 5. API RESPONSE ENVELOPE (§15.1)
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode | string;
    message: string;
  };
  meta: {
    requestId: string;
    timestamp: number;
    latencyMs?: number; // Optional visual for demo
  };
}
