import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticateRequest } from "./auth";
import { signJwt } from "../auth/jwt";

describe("Auth Middleware", () => {
  const secret = "test-secret";
  const env = { JWT_SECRET: secret } as any;

  it("should authorize request with valid Bearer token", async () => {
    const payload = {
      userId: "user-1",
      sessionId: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await signJwt(payload, secret);

    const request = new Request("http://api/data/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { auth, errorResponse } = await authenticateRequest(request, env);
    expect(auth).toMatchObject(payload);
    expect(errorResponse).toBeNull();
  });

  it("should authorize request with valid cookie token", async () => {
    const payload = {
      userId: "user-2",
      sessionId: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await signJwt(payload, secret);

    const request = new Request("http://api/data/test", {
      headers: { Cookie: `token=${token}` },
    });

    const { auth, errorResponse } = await authenticateRequest(request, env);
    expect(auth).toMatchObject(payload);
  });

  it("should return 401 for missing token", async () => {
    const request = new Request("http://api/data/test");
    const { auth, errorResponse } = await authenticateRequest(request, env);

    expect(auth).toBeNull();
    expect(errorResponse?.status).toBe(401);
  });

  it("should return 401 for invalid token", async () => {
    const request = new Request("http://api/data/test", {
      headers: { Authorization: "Bearer invalid-token" },
    });
    const { auth, errorResponse } = await authenticateRequest(request, env);

    expect(auth).toBeNull();
    expect(errorResponse?.status).toBe(401);
  });
});
