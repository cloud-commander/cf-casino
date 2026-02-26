import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleBetAuthorize, handleBetConfirm } from "./betting";
import { Env } from "../worker";

describe("Betting Routes", () => {
  let mockEnv: any;
  let mockCtx: any;
  let mockAuth: any;

  beforeEach(() => {
    const mockLedgerStub = {
      fetch: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true }), { status: 200 }),
        ),
    };
    mockEnv = {
      BETTING_LEDGER: {
        idFromName: vi.fn().mockReturnValue("ledger-id"),
        get: vi.fn().mockReturnValue(mockLedgerStub),
      },
      AUDIT_QUEUE: {
        send: vi.fn(),
      },
    };
    mockCtx = {
      waitUntil: vi.fn(),
    };
    mockAuth = { userId: "user-1", sessionId: "session-1" };
  });

  it("should authorize bet and shard by userId", async () => {
    const body = {
      amount: 500,
      matchId: "match-1",
      requestId: crypto.randomUUID(),
      userId: "user-1",
    };
    const request = new Request("http://api/bet/authorize", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await handleBetAuthorize(
      request,
      mockEnv as Env,
      mockCtx,
      mockAuth,
    );

    expect(mockEnv.BETTING_LEDGER.idFromName).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(200);
    expect(mockCtx.waitUntil).toHaveBeenCalled();
    expect(mockEnv.AUDIT_QUEUE.send).toHaveBeenCalled();
  });

  it("should confirm bet and shard by userId", async () => {
    const body = {
      holdId: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      userId: "user-1",
    };
    const request = new Request("http://api/bet/confirm", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await handleBetConfirm(
      request,
      mockEnv as Env,
      mockCtx,
      mockAuth,
    );

    expect(mockEnv.BETTING_LEDGER.idFromName).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(200);
    expect(mockCtx.waitUntil).toHaveBeenCalled();
  });

  it("should return 400 for validation error in authorize", async () => {
    const request = new Request("http://api/bet/authorize", {
      method: "POST",
      body: JSON.stringify({ amount: "invalid" }),
    });

    const response = await handleBetAuthorize(
      request,
      mockEnv as Env,
      mockCtx,
      mockAuth,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("should return 400 for validation error in confirm", async () => {
    const request = new Request("http://api/bet/confirm", {
      method: "POST",
      body: JSON.stringify({ holdId: 123 }),
    });

    const response = await handleBetConfirm(
      request,
      mockEnv as Env,
      mockCtx,
      mockAuth,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("should return 503 if DO fetch fails in authorize", async () => {
    mockEnv.BETTING_LEDGER.get().fetch.mockRejectedValue(new Error("DO Down"));

    const body = {
      amount: 500,
      matchId: "match-1",
      requestId: crypto.randomUUID(),
      userId: "user-1",
    };
    const request = new Request("http://api/bet/authorize", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await handleBetAuthorize(
      request,
      mockEnv as Env,
      mockCtx,
      mockAuth,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(503);
    expect(data.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("should return 503 if DO fetch fails in confirm", async () => {
    mockEnv.BETTING_LEDGER.get().fetch.mockRejectedValue(new Error("DO Down"));

    const body = {
      holdId: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      userId: "user-1",
    };
    const request = new Request("http://api/bet/confirm", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await handleBetConfirm(
      request,
      mockEnv as Env,
      mockCtx,
      mockAuth,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(503);
    expect(data.error.code).toBe("SERVICE_UNAVAILABLE");
  });
});
