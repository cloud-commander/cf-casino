import { Env } from "../worker";
import { ErrorCode } from "@shared/types";
import { CONFIG } from "@shared/constants";
import { createErrorResponse } from "../utils/response";

// Module-level cache for lockdown status
let cachedLockdown: boolean | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 10000;

export async function checkGovernor(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const now = Date.now();

  // 1. Check Module Cache
  if (cachedLockdown === null || now - lastCacheUpdate > CACHE_TTL_MS) {
    // 2. Fallback to KV
    const lockdownFlag = await env.GOVERNOR_KV.get("governor:lockdown");
    cachedLockdown = lockdownFlag === "true";
    lastCacheUpdate = now;
  }

  // 3. Reject if lockdown is active
  if (cachedLockdown) {
    return createErrorResponse(
      ErrorCode.QUOTA_EXHAUSTED,
      "Platform in lockdown: Monthly/Daily quota reached.",
      503,
    );
  }

  // 4. Fire-and-forget increment to DO
  const governorId = env.GLOBAL_GOVERNOR.idFromName("global-singleton");
  const governorStub = env.GLOBAL_GOVERNOR.get(governorId);

  // Use ctx.waitUntil to ensure the increment finishes without blocking the response
  ctx.waitUntil(governorStub.fetch(new Request("http://governor/increment")));

  return null;
}

export function __resetGovernorCache() {
  cachedLockdown = null;
  lastCacheUpdate = 0;
}
