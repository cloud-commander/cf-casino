import { Env } from "../worker";

interface LatencyRecord {
  timestamp: number;
  edgeMs: number;
  originMs: number;
}

export class LatencyComparator implements DurableObject {
  private history: LatencyRecord[] = [];

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {
    this.state.blockConcurrencyWhile(async () => {
      this.history =
        (await this.state.storage.get<LatencyRecord[]>("history")) || [];
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/bench" && request.method === "POST") {
      return await this.runBenchmark();
    }

    if (url.pathname === "/history") {
      return new Response(
        JSON.stringify({ success: true, data: this.history }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response("Not Found", { status: 404 });
  }

  private async runBenchmark(): Promise<Response> {
    // 1. Edge Benchmark (KV Read)
    const startEdge = performance.now();
    await this.env.GAME_LOBBY.get("match:latest");
    const edgeMs = performance.now() - startEdge;

    // 2. Simulated Origin Benchmark (Artificial latency + fetch)
    // In a real demo, this might be a fetch to a different region
    const startOrigin = performance.now();
    await new Promise((r) => setTimeout(r, 150)); // Simulated RTT to origin
    const originMs = performance.now() - startOrigin;

    const record: LatencyRecord = {
      timestamp: Date.now(),
      edgeMs,
      originMs,
    };

    this.history.push(record);
    if (this.history.length > 100) this.history.shift(); // Keep last 100

    await this.state.storage.put("history", this.history);

    return new Response(JSON.stringify({ success: true, data: record }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
