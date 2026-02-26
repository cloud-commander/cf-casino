import { describe, it, expect } from "vitest";
import { signJwt, verifyJwt } from "./jwt";
import { SessionPayload } from "@shared/types";

describe("JWT Service", () => {
  const secret = "test-secret-key-12345678901234567890";
  const payload: SessionPayload = {
    userId: "user-1",
    sessionId: "123e4567-e89b-12d3-a456-426614174000",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  it("should sign and verify a valid payload", async () => {
    const token = await signJwt(payload, secret);
    expect(token).toBeDefined();

    const verified = await verifyJwt(token, secret);
    expect(verified).toMatchObject(payload);
  });

  it("should return null for invalid signature", async () => {
    const token = await signJwt(payload, secret);
    const verified = await verifyJwt(token, "wrong-secret");
    expect(verified).toBeNull();
  });

  it("should return null for expired token", async () => {
    const expiredPayload = { ...payload, exp: payload.iat - 10 };
    const token = await signJwt(expiredPayload, secret);
    const verified = await verifyJwt(token, secret);
    expect(verified).toBeNull();
  });

  it("should return null for malformed payload (Advisory A-4)", async () => {
    // Create a token with a missing field that Zod expects
    const malformed: any = {
      userId: "user-1",
      iat: payload.iat,
      exp: payload.exp,
    };
    const token = await signJwt(malformed, secret);
    const verified = await verifyJwt(token, secret);
    expect(verified).toBeNull();
  });
});
