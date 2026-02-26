import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleScheduledPruning } from "./pruning";
import { Env } from "../worker";

describe("Maintenance Pruning", () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: vi.fn().mockImplementation((sql: string) => ({
          bind: vi.fn().mockReturnThis(),
          run: vi.fn(),
        })),
        batch: vi.fn().mockResolvedValue([{ success: true }]),
      },
      ENVIRONMENT: "test",
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should execute pruning queries in a batch", async () => {
    await handleScheduledPruning(mockEnv as Env);

    expect(mockEnv.DB.batch).toHaveBeenCalled();
    expect(mockEnv.DB.prepare).toHaveBeenCalledTimes(3);
    expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
      expect.stringContaining("CASINO_AUDIT_LOGS"),
    );
  });

  it("should handle pruning failures gracefully", async () => {
    mockEnv.DB.batch.mockRejectedValue(new Error("Batch failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await handleScheduledPruning(mockEnv as Env);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Pruning failed"),
    );
  });
});
