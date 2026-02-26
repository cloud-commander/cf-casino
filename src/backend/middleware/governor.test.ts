import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkGovernor, __resetGovernorCache } from "./governor";
import { Env } from "../worker";

describe("Governor Middleware", () => {
  let mockEnv: any;
  let mockCtx: any;

  beforeEach(() => {
    __resetGovernorCache();
    mockEnv = {
      GOVERNOR_KV: { get: vi.fn().mockResolvedValue(null) },
      GLOBAL_GOVERNOR: {
        idFromName: vi.fn().mockReturnValue("gov-id"),
        get: vi
          .fn()
          .mockReturnValue({
            fetch: vi.fn().mockResolvedValue(new Response()),
          }),
      },
    };
    mockCtx = {
      waitUntil: vi.fn(),
    };
  });

  it("should allow request and fire-and-forget increment", async () => {
    const req = new Request("http://api/health");
    const res = await checkGovernor(req, mockEnv as Env, mockCtx);

    expect(res).toBeNull();
    expect(mockCtx.waitUntil).toHaveBeenCalled();
    expect(mockEnv.GOVERNOR_KV.get).toHaveBeenCalledWith("governor:lockdown");
  });

  it("should reject request when lockdown is active in KV", async () => {
    mockEnv.GOVERNOR_KV.get.mockResolvedValue("true");
    const req = new Request("http://api/health");
    const res = await checkGovernor(req, mockEnv as Env, mockCtx);

    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
    const data = (await res!.json()) as any;
    expect(data.error.code).toBe("QUOTA_EXHAUSTED");
  });

  it("should use local cache after first KV check", async () => {
    const req = new Request("http://api/health");

    // First check
    await checkGovernor(req, mockEnv as Env, mockCtx);
    expect(mockEnv.GOVERNOR_KV.get).toHaveBeenCalledTimes(1);

    // Second check (cached)
    await checkGovernor(req, mockEnv as Env, mockCtx);
    expect(mockEnv.GOVERNOR_KV.get).toHaveBeenCalledTimes(1);
  });
});
