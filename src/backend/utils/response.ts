import { ApiResponse, ErrorCode } from "@shared/types";

/**
 * Standard utility to generate a successful JSON response.
 */
export function createApiResponse<T>(
  data: T,
  requestId: string = crypto.randomUUID(),
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: Date.now(),
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Standard utility to generate an error JSON response.
 */
export function createErrorResponse(
  code: ErrorCode | string,
  message: string,
  status: number = 400,
  requestId: string = crypto.randomUUID(),
): Response {
  const payload: ApiResponse = {
    success: false,
    error: { code, message },
    meta: {
      requestId,
      timestamp: Date.now(),
    },
  };

  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
