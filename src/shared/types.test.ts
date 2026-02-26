import { describe, it, expect } from "vitest";
import { BetAuthorizeRequestSchema, QueueMessageSchema } from "./types";

describe("Shared Types & Schemas", () => {
  describe("BetAuthorizeRequestSchema", () => {
    it("validates valid payload", () => {
      const valid = {
        userId: "user_123",
        amount: 5000, // £50.00
        matchId: "roulette-01",
        requestId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = BetAuthorizeRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails when amount is over maximum threshold (£1000.00 / 100000 cents)", () => {
      const invalid = {
        userId: "user_123",
        amount: 200000,
        matchId: "roulette-01",
        requestId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = BetAuthorizeRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("fails with invalid requestId format", () => {
      const invalid = {
        userId: "user_123",
        amount: 5000,
        matchId: "roulette-01",
        requestId: "not-a-uuid",
      };

      const result = BetAuthorizeRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("QueueMessageSchema", () => {
    it("validates successful queue message (BET_AUTHORIZE)", () => {
      const valid = {
        requestId: "123e4567-e89b-12d3-a456-426614174000",
        timestamp: Date.now(),
        userId: "user_123",
        action: "BET_AUTHORIZE",
        metadata: { matchId: "test-match" },
      };

      const result = QueueMessageSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
