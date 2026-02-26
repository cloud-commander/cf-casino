import { describe, it, expect, beforeEach, vi } from "vitest";
import { RouletteTable } from "./RouletteTable";
import { Env } from "../worker";

class MockStorage {
  private data: Map<string, any> = new Map();
  private alarm: number | null = null;

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T;
  }

  async put(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async setAlarm(timestamp: number): Promise<void> {
    this.alarm = timestamp;
  }

  async getAlarm(): Promise<number | null> {
    return this.alarm;
  }
}

describe("RouletteTable (Durable Object)", () => {
  let mockState: any;
  let mockEnv: any;
  let mockWebSockets: any[];

  beforeEach(async () => {
    mockWebSockets = [];
    mockState = {
      storage: new MockStorage(),
      blockConcurrencyWhile: vi.fn(async (fn) => await fn()),
      acceptWebSocket: vi.fn((ws) => mockWebSockets.push(ws)),
      getWebSockets: vi.fn(() => mockWebSockets),
    };
    mockEnv = {};

    (globalThis as any).WebSocketPair = class {
      0 = {};
      1 = { send: vi.fn(), close: vi.fn() };
    };
  });

  it("should resume state from storage in constructor", async () => {
    const savedState = {
      state: "SPINNING",
      nextTransition: Date.now() + 1000,
      lastBall: null,
    };
    await mockState.storage.put("gameState", savedState);

    const table = new RouletteTable(mockState, mockEnv as unknown as Env);
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    expect((table as any).gameState.state).toBe("SPINNING");
  });

  it("should transition state if resumed alarm is in the past", async () => {
    const savedState = {
      state: "SPINNING",
      nextTransition: Date.now() - 1000,
      lastBall: null,
    };
    await mockState.storage.put("gameState", savedState);

    const table = new RouletteTable(mockState, mockEnv as unknown as Env);
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    expect((table as any).gameState.state).toBe("RESULT");
  });

  it("should return 400 for non-websocket fetch", async () => {
    const table = new RouletteTable(mockState, mockEnv as unknown as Env);
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    const request = new Request("http://table/state");
    const response = await table.fetch(request);
    expect(response.status).toBe(400);
  });

  it("should handle initial connection and sync state", async () => {
    const table = new RouletteTable(mockState, mockEnv as unknown as Env);
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    const request = new Request("ws://table", {
      headers: { Upgrade: "websocket" },
    });

    try {
      await table.fetch(request);
    } catch (e) {}

    expect(mockState.acceptWebSocket).toHaveBeenCalled();
  });

  it("should transition through states on alarm", async () => {
    const table = new RouletteTable(mockState, mockEnv as unknown as Env);
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    await table.alarm();
    expect((table as any).gameState.state).toBe("SPINNING");
    await table.alarm();
    expect((table as any).gameState.state).toBe("RESULT");
    await table.alarm();
    expect((table as any).gameState.state).toBe("IDLE");
  });

  it("should broadcast state changes", async () => {
    const table = new RouletteTable(mockState, mockEnv as unknown as Env);
    await (mockState.blockConcurrencyWhile as any).mock.results[0].value;

    const mockWs = { send: vi.fn() };
    mockWebSockets.push(mockWs);

    await table.alarm();
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"STATE_CHANGE"'),
    );
  });
});
