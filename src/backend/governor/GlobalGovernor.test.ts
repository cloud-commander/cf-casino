import { describe, it, expect, beforeEach, vi } from "vitest";
import { GlobalGovernor } from "./GlobalGovernor";
import { Env } from "../worker";

class MockStorage {
  private data: Map<string, any> = new Map();

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T;
  }

  async put(key: string | Record<string, any>, value?: any): Promise<void> {
    if (typeof key === "string") {
      this.data.set(key, value);
    } else {
      for (const [k, v] of Object.entries(key)) {
        this.data.set(k, v);
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }
}

describe("GlobalGovernor (Durable Object)", () => {
  let mockState: any;
  let mockEnv: any;

  beforeEach(() => {
    mockState = {
      storage: new MockStorage(),
      blockConcurrencyWhile: vi.fn(async (fn) => await fn()),
    };
    mockEnv = {
      GOVERNOR_KV: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ENVIRONMENT: "test",
    };
  });

  it("should increment counters and persist on every request", async () => {
    const governor = new GlobalGovernor(mockState, mockEnv as unknown as Env);
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    const req = new Request("http://governor/increment");

    await governor.fetch(req);
    expect(await mockState.storage.get("dailyCount")).toBe(1);
    expect(await mockState.storage.get("monthlyCount")).toBe(1);

    await governor.fetch(req);
    expect(await mockState.storage.get("dailyCount")).toBe(2);
  });

  it("should reset daily counter on a new day", async () => {
    await mockState.storage.put("currentDay", "2000-01-01");
    await mockState.storage.put("dailyCount", 500);

    const governor = new GlobalGovernor(mockState, mockEnv as unknown as Env);
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    const req = new Request("http://governor/increment");

    await governor.fetch(req);

    expect(await mockState.storage.get("dailyCount")).toBe(1);
    expect(mockEnv.GOVERNOR_KV.delete).toHaveBeenCalledWith(
      "governor:lockdown",
    );
  });

  it("should trigger lockdown when daily limit is reached", async () => {
    const governor = new GlobalGovernor(mockState, mockEnv as unknown as Env);
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    const req = new Request("http://governor/increment");

    (governor as any).dailyCount = 64999;

    await governor.fetch(req);

    expect(mockEnv.GOVERNOR_KV.put).toHaveBeenCalledWith(
      "governor:lockdown",
      "true",
      expect.any(Object),
    );
  });
});
