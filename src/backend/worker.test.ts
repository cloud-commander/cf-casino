import { describe, it, expect, vi, beforeEach } from "vitest";
import worker from "./worker";
import { Env } from "./worker";
import { signJwt } from "./auth/jwt";
import { __resetGovernorCache } from "./middleware/governor";

describe("Worker Entry Point", () => {
  let mockEnv: any;
  let mockCtx: any;

  beforeEach(() => {
    __resetGovernorCache();
    mockEnv = {
      ENVIRONMENT: "test",
      JWT_SECRET: "test-secret",
      GOVERNOR_KV: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
      GLOBAL_GOVERNOR: {
        idFromName: vi.fn().mockReturnValue("gov-id"),
        get: vi.fn().mockReturnValue({
          fetch: vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify({ success: true }))),
        }),
      },
      BETTING_LEDGER: {
        idFromName: vi.fn().mockReturnValue("ledger-id"),
        get: vi.fn().mockReturnValue({
          fetch: vi
            .fn()
            .mockResolvedValue(
              new Response(JSON.stringify({ success: true, balance: 100000 }), {
                status: 200,
              }),
            ),
        }),
      },
      ROULETTE_TABLE: {
        idFromName: vi.fn().mockReturnValue("table-id"),
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
        }),
      },
      LATENCY_COMPARATOR: {
        idFromName: vi.fn().mockReturnValue("comp-id"),
        get: vi.fn().mockReturnValue({
          fetch: vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify({ success: true }))),
        }),
      },
      DB: {
        batch: vi.fn().mockResolvedValue([{ success: true }]),
        prepare: vi.fn().mockImplementation((sql: string) => ({
          bind: vi.fn().mockReturnThis(),
          first: vi
            .fn()
            .mockResolvedValue({ user_id: "u123", balance_cents: 100000 }),
          run: vi.fn().mockResolvedValue({ success: true }),
        })),
      },
      AUDIT_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
      VERSION: "1.0.0",
      ROLLBAR_TOKEN: "mock",
    };
    mockCtx = {
      waitUntil: vi.fn(),
    };

    mockEnv.GOVERNOR_KV.get.mockResolvedValue(null);
  });

  it("should return 204 for OPTIONS preflight", async () => {
    const req = new Request("http://api/health", { method: "OPTIONS" });
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(204);
  });

  it("should return 200 for /health", async () => {
    const req = new Request("http://api/health");
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(200);
  });

  it("should route to login", async () => {
    const body = {
      userId: "u123",
      pin: "1234",
      requestId: crypto.randomUUID(),
    };
    const req = new Request("http://api/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.data.balance).toBe(100000);
  });

  it("should return 503 when global governor is in lockdown (Quota Exhausted)", async () => {
    mockEnv.GOVERNOR_KV.get.mockResolvedValue("true");
    const req = new Request("http://api/health");
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(503);
    const data = (await res.json()) as any;
    expect(data.error.code).toBe("QUOTA_EXHAUSTED");
  });

  it("should return 401 for protected routes without JWT", async () => {
    const req = new Request("http://api/api/data/user/profile");
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(401);
  });

  async function getAuthHeaders() {
    const token = await signJwt(
      {
        userId: "u123",
        sessionId: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      "test-secret",
    );
    return { Authorization: `Bearer ${token}` };
  }

  it("should route to betting authorize with JWT and full body", async () => {
    const headers = await getAuthHeaders();
    const req = new Request("http://api/api/data/bet/authorize", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "u123",
        amount: 100,
        matchId: "m1",
        requestId: crypto.randomUUID(),
      }),
    });
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(200);
  });

  it("should route to betting confirm with JWT and full body", async () => {
    const headers = await getAuthHeaders();
    const req = new Request("http://api/api/data/bet/confirm", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "u123",
        holdId: crypto.randomUUID(),
        requestId: crypto.randomUUID(),
      }),
    });
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(200);
  });

  it("should route to roulette websocket with JWT", async () => {
    const headers = await getAuthHeaders();
    const req = new Request("http://api/api/ws/roulette", {
      headers: { ...headers, Upgrade: "websocket" },
    });
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(200);
  });

  it("should route to audio token with JWT", async () => {
    const headers = await getAuthHeaders();
    const req = new Request("http://api/api/ws/audio/token", {
      method: "POST",
      headers: headers,
    });
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(200);
  });

  it("should route to latency bench with JWT", async () => {
    const headers = await getAuthHeaders();
    const req = new Request("http://api/api/data/latency/bench", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
    });
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(200);
  });

  it("should route to user profile with JWT", async () => {
    const headers = await getAuthHeaders();
    const req = new Request("http://api/api/data/user/profile", {
      headers: headers,
    });
    const res = await worker.fetch(req, mockEnv as Env, mockCtx);
    expect(res.status).toBe(200);
  });

  it("should handle scheduled pruning", async () => {
    await worker.scheduled({} as any, mockEnv as Env, mockCtx);
    expect(mockCtx.waitUntil).toHaveBeenCalled();
  });

  it("should handle queue processing", async () => {
    await worker.queue({ messages: [] } as any, mockEnv as Env);
  });
});
