import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAuditQueue } from "./consumer";
import { QueueMessage } from "@shared/types";
import { Env } from "../worker";

describe("Compliance Queue Consumer", () => {
  let mockEnv: any;
  let mockBatch: any;

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: vi.fn().mockImplementation((sql: string) => ({
          bind: vi.fn().mockReturnThis(),
          // mock current D1 interface if used directly
          run: vi.fn().mockResolvedValue({ success: true }),
        })),
        batch: vi.fn().mockResolvedValue([{ success: true }]),
      },
      ENVIRONMENT: "test",
      VERSION: "1.0.0",
    };

    const messages = [
      {
        body: {
          requestId: "req-1",
          timestamp: Date.now(),
          userId: "user-1",
          action: "BET_AUTHORIZE",
          amount: 1000,
          metadata: { ip: "127.0.0.1" },
        } as QueueMessage,
      },
    ];

    mockBatch = { messages };
  });

  it("should successfully insert a batch of logs into D1 using batch API", async () => {
    await handleAuditQueue(mockBatch, mockEnv);

    expect(mockEnv.DB.prepare).toHaveBeenCalled();
    expect(mockEnv.DB.batch).toHaveBeenCalled();

    const batchCalls = (mockEnv.DB.batch as any).mock.calls[0][0];
    // Check both audit log and balance update are present in batch
    expect(batchCalls.length).toBe(2);
  });

  it("should route to dead letter logs on D1 failure", async () => {
    mockEnv.DB.batch = vi.fn().mockRejectedValue(new Error("D1 Error"));

    // Dead letter insert is typically outside the batch if it's the fallback
    await handleAuditQueue(mockBatch, mockEnv);

    expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO CASINO_DEAD_AUDIT_LOGS"),
    );
  });

  it("should handle empty batch gracefully", async () => {
    mockBatch.messages = [];
    await handleAuditQueue(mockBatch, mockEnv);
    expect(mockEnv.DB.prepare).not.toHaveBeenCalled();
    expect(mockEnv.DB.batch).not.toHaveBeenCalled();
  });
});
