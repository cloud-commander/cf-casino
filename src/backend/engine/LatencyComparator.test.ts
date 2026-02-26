import { describe, it, expect, beforeEach, vi } from "vitest";
import { LatencyComparator } from "./LatencyComparator";
import { Env } from "../worker";

class MockStorage {
  private data: Map<string, any> = new Map();
  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T;
  }
  async put(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }
}

describe("LatencyComparator (Durable Object)", () => {
  let mockState: any;
  let mockEnv: any;

  beforeEach(() => {
    mockState = {
      storage: new MockStorage(),
      blockConcurrencyWhile: vi.fn(async (fn) => await fn()),
    };
    mockEnv = {
      GAME_LOBBY: {
        get: vi.fn().mockResolvedValue("lobby-data"),
      },
    };
  });

  it("should run benchmark and record history", async () => {
    const comparator = new LatencyComparator(
      mockState,
      mockEnv as unknown as Env,
    );
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    const req = new Request("http://comparator/bench", { method: "POST" });
    const res = await comparator.fetch(req);
    const data = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.edgeMs).toBeDefined();

    const history = await mockState.storage.get("history");
    expect(history).toHaveLength(1);
  });

  it("should return history", async () => {
    await mockState.storage.put("history", [
      { timestamp: Date.now(), edgeMs: 5, originMs: 155 },
    ]);

    const comparator = new LatencyComparator(
      mockState,
      mockEnv as unknown as Env,
    );
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    const req = new Request("http://comparator/history");
    const res = await comparator.fetch(req);
    const data = (await res.json()) as any;

    expect(data.data).toHaveLength(1);
    expect(data.data[0].edgeMs).toBe(5);
  });
});
