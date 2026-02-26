import { Env } from "../worker";
import { SessionPayload } from "@shared/types";
import { verifyJwt } from "../auth/jwt";

// Helper function to extract auth payload or return an error response
export async function authenticateRequest(
  request: Request,
  env: Env,
): Promise<{ auth: SessionPayload | null; errorResponse: Response | null }> {
  // Extract token from Authorization header (Bearer token)
  let token = "";
  const authHeader = request.headers.get("Authorization");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7);
  } else {
    // Alternatively look for a cookie (for WebSocket upgrades etc.)
    const cookieHeader = request.headers.get("Cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/token=([a-zA-Z0-9._-]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  if (!token) {
    return {
      auth: null,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: { code: "AUTH_REQUIRED", message: "Missing JWT Token" },
          meta: { requestId: crypto.randomUUID(), timestamp: Date.now() },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  const payload = await verifyJwt(token, env.JWT_SECRET);

  if (!payload) {
    return {
      auth: null,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "SESSION_INVALID",
            message: "Invalid or expired JWT Token",
          },
          meta: { requestId: crypto.randomUUID(), timestamp: Date.now() },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  return { auth: payload, errorResponse: null };
}
