import { describe, it, expect, vi, beforeEach } from "vitest";
import { Logger } from "./logger";
import { Env } from "../worker";

describe("Logger", () => {
  let mockEnv: any;
  let mockCtx: any;

  beforeEach(() => {
    mockEnv = {
      ENVIRONMENT: "test",
      VERSION: "1.0.0",
      ROLLBAR_TOKEN: "test-token",
    };
    mockCtx = {
      waitUntil: vi.fn(),
    };

    // Mock global fetch
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    // Mock console
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should log debug and info levels", () => {
    const logger = new Logger(mockEnv);
    logger.debug("test debug");
    logger.info("test info");

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("DEBUG"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("INFO"));
  });

  it("should log warn and error levels to console.error", () => {
    const logger = new Logger(mockEnv);
    logger.warn("test warn");
    logger.error("test error", new Error("test err"));

    expect(console.error).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("WARN"));
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR"),
    );
  });

  it("should send to Rollbar in non-local environments", () => {
    const logger = new Logger(mockEnv, mockCtx);
    logger.error("重大エラー", new Error("Fatal"));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.rollbar.com/api/1/item/",
      expect.any(Object),
    );
    expect(mockCtx.waitUntil).toHaveBeenCalled();
  });

  it("should handle non-Error objects in error logging", () => {
    const logger = new Logger(mockEnv, mockCtx);
    logger.error("String error", "Just a string");

    expect(globalThis.fetch).toHaveBeenCalled();
    const callBody = JSON.parse(
      (globalThis.fetch as any).mock.calls[0][1].body,
    );
    expect(callBody.data.body.trace.message.extra.error).toBe("Just a string");
  });

  it("should not send to Rollbar in local environment", () => {
    mockEnv.ENVIRONMENT = "local";
    const logger = new Logger(mockEnv, mockCtx);
    logger.error("Local error", new Error("Local"));

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("should use provide traceId or generate one", () => {
    const logger1 = new Logger(mockEnv, undefined, "custom-trace");
    const logger2 = new Logger(mockEnv);

    expect((logger1 as any).traceId).toBe("custom-trace");
    expect((logger2 as any).traceId).toBeDefined();
  });
});
