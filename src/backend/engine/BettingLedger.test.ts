import { describe, it, expect, beforeEach, vi } from "vitest";
import { BettingLedger } from "./BettingLedger";
import { Env } from "../worker";
import { ErrorCode } from "@shared/types";

// Mock DO State
class MockStorage {
  private data: Map<string, any> = new Map();
  private alarm: number | null = null;

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T;
  }

  async put(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async transaction(closure: (txn: any) => Promise<any>): Promise<any> {
    return closure(this);
  }

  async setAlarm(timestamp: number): Promise<void> {
    this.alarm = timestamp;
  }

  async getAlarm(): Promise<number | null> {
    return this.alarm;
  }
}

describe("BettingLedger (Durable Object)", () => {
  let mockState: any;
  let mockEnv: Env;
  let ledger: BettingLedger;

  beforeEach(() => {
    mockState = {
      storage: new MockStorage(),
    };
    mockEnv = {
      ENVIRONMENT: "test",
      VERSION: "1.0.0",
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn().mockResolvedValue({ balance_cents: 100000 }),
        }),
      },
      AUDIT_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      },
      ROLLBAR_TOKEN: "mock-token",
    } as any as Env;

    ledger = new BettingLedger(mockState, mockEnv);
  });

  describe("POST /authorize", () => {
    it("should authorize a valid bet and deduct balance", async () => {
      const reqBody = {
        userId: "user_1",
        amount: 1000,
        matchId: "match_1",
        requestId: "req_1",
      };

      const request = new Request("http://ledger/authorize", {
        method: "POST",
        body: JSON.stringify(reqBody),
      });

      const response = await ledger.fetch(request);
      const resData = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(resData.success).toBe(true);
      expect(resData.data.balance).toBe(99000);
      expect(resData.data.holdId).toBe("req_1");

      const storedHold = await mockState.storage.get("activeHold");
      expect(storedHold.id).toBe("req_1");
      expect(storedHold.amount).toBe(1000);

      expect(mockEnv.AUDIT_QUEUE.send).toHaveBeenCalled();
    });

    it("should fail if balance is insufficient", async () => {
      await mockState.storage.put("balance", 500);

      const reqBody = {
        userId: "user_1",
        amount: 1000,
        matchId: "match_1",
        requestId: "req_2",
      };

      const request = new Request("http://ledger/authorize", {
        method: "POST",
        body: JSON.stringify(reqBody),
      });

      const response = await ledger.fetch(request);
      const resData = (await response.json()) as any;

      expect(response.status).toBe(400);
      expect(resData.success).toBe(false);
      expect(resData.error.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
    });

    it("should fail if there is an active hold", async () => {
      await mockState.storage.put("activeHold", {
        id: "existing_hold",
        amount: 500,
        expiresAt: Date.now() + 10000,
        status: "PENDING",
      });

      const reqBody = {
        userId: "user_1",
        amount: 1000,
        matchId: "match_1",
        requestId: "req_3",
      };

      const request = new Request("http://ledger/authorize", {
        method: "POST",
        body: JSON.stringify(reqBody),
      });

      const response = await ledger.fetch(request);
      const resData = (await response.json()) as any;

      expect(response.status).toBe(400);
      expect(resData.error.code).toBe(ErrorCode.HOLD_ALREADY_ACTIVE);
    });

    it("should succeed idempotently if client retries exact same requestId", async () => {
      await mockState.storage.put("activeHold", {
        id: "req_retry",
        amount: 1000,
        expiresAt: Date.now() + 10000,
        status: "PENDING",
      });
      await mockState.storage.put("balance", 99000);

      const reqBody = {
        userId: "user_1",
        amount: 1000,
        matchId: "match_1",
        requestId: "req_retry",
      };

      const request = new Request("http://ledger/authorize", {
        method: "POST",
        body: JSON.stringify(reqBody),
      });

      const response = await ledger.fetch(request);
      const resData = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(resData.success).toBe(true);
      expect(resData.data.holdId).toBe("req_retry");
    });
  });

  describe("POST /confirm", () => {
    it("should confirm a valid hold and finalize state", async () => {
      await mockState.storage.put("balance", 99000);
      await mockState.storage.put("activeHold", {
        id: "req_1",
        amount: 1000,
        expiresAt: Date.now() + 30000,
        status: "PENDING",
      });

      const reqBody = {
        userId: "user_1",
        holdId: "req_1",
        requestId: "req_confirm_1",
      };

      const request = new Request("http://ledger/confirm", {
        method: "POST",
        body: JSON.stringify(reqBody),
      });

      const response = await ledger.fetch(request);
      const resData = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(resData.success).toBe(true);
      expect(resData.data.balance).toBe(99000);

      const storedHold = await mockState.storage.get("activeHold");
      expect(storedHold).toBeUndefined();

      expect(mockEnv.AUDIT_QUEUE.send).toHaveBeenCalled();
    });

    it("should fail if holdId does not match", async () => {
      await mockState.storage.put("activeHold", {
        id: "some_other_hold",
        amount: 1000,
        expiresAt: Date.now() + 30000,
        status: "PENDING",
      });

      const reqBody = {
        userId: "user_1",
        holdId: "req_invalid",
        requestId: "req_confirm_2",
      };

      const request = new Request("http://ledger/confirm", {
        method: "POST",
        body: JSON.stringify(reqBody),
      });

      const response = await ledger.fetch(request);
      const resData = (await response.json()) as any;

      expect(response.status).toBe(400);
      expect(resData.error.code).toBe(ErrorCode.HOLD_EXPIRED);
    });
  });

  describe("alarm()", () => {
    it("should rollback expired hold and restore balance", async () => {
      await mockState.storage.put("balance", 99000);
      await mockState.storage.put("activeHold", {
        id: "expired_hold",
        amount: 1000,
        expiresAt: Date.now() - 1000,
        status: "PENDING",
      });

      await ledger.alarm();

      const balance = await mockState.storage.get("balance");
      const activeHold = await mockState.storage.get("activeHold");

      expect(balance).toBe(100000);
      expect(activeHold).toBeUndefined();
      expect(mockEnv.AUDIT_QUEUE.send).toHaveBeenCalled();
    });
  });
});
