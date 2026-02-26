import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleLogin } from "./login";
import { Env } from "../worker";

describe("Login Handler", () => {
  let mockEnv: any;
  let mockCtx: any;

  beforeEach(() => {
    mockEnv = {
      JWT_SECRET: "test-secret",
      DB: {
        prepare: vi.fn().mockImplementation((sql: string) => ({
          bind: vi.fn().mockReturnThis(),
          first: vi
            .fn()
            .mockResolvedValue({ user_id: "user_123", balance_cents: 100000 }),
          run: vi.fn().mockResolvedValue({ success: true }),
        })),
      },
      AUDIT_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      },
      ENVIRONMENT: "test",
      VERSION: "1.0.0",
    };
    mockCtx = {
      waitUntil: vi.fn(),
    };
  });

  it("should login successfully with valid payload (existing user)", async () => {
    const requestId = crypto.randomUUID();
    const request = new Request("http://api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        userId: "user_123",
        pin: "1234",
        requestId,
      }),
    });

    const response = await handleLogin(request, mockEnv as Env, mockCtx);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.userId).toBe("user_123");
    expect(data.data.balance).toBe(100000);
    expect(response.headers.get("Set-Cookie")).toContain("token=");
    expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
      expect.stringContaining("SELECT"),
    );
    expect(mockEnv.AUDIT_QUEUE.send).toHaveBeenCalled();
  });

  it("should initialize a new user if not found", async () => {
    mockEnv.DB.prepare = vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null), // simulate not found
      run: vi.fn().mockResolvedValue({ success: true }),
    }));

    const requestId = crypto.randomUUID();
    const request = new Request("http://api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        userId: "new_player",
        pin: "1234",
        requestId,
      }),
    });

    const response = await handleLogin(request, mockEnv as Env, mockCtx);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.data.balance).toBe(100000);
    expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT"),
    );
  });

  it("should fail for invalid payload (missing requestId)", async () => {
    const request = new Request("http://api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        userId: "user_123",
        pin: "1234",
      }),
    });

    const response = await handleLogin(request, mockEnv as Env, mockCtx);
    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
