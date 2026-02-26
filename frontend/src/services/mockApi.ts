export interface MockApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta: {
    requestId: string;
    timestamp: number;
    latencyMs: number; // For demo visualization
  };
}

// Utility to delay promises to simulate network jitter
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const MockApiService = {
  // Phase 1: Authorize (Fast D1/KV read, DO execution) => ~15ms simulated
  async authorizeBet(
    _userId: string,
    _amount: number,
  ): Promise<MockApiResponse<{ holdId: string; expiresIn: number }>> {
    console.log(`Mock authorize for user ${_userId} with amount ${_amount}`);
    const latency = Math.floor(Math.random() * 10) + 10; // 10-20ms
    await delay(latency);

    return {
      success: true,
      data: {
        holdId: `hold_${Math.random().toString(36).substring(7)}`,
        expiresIn: 30,
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        latencyMs: latency,
      },
    };
  },

  // Phase 2: Confirm (Fast DO execute + Async Queue enqueue) => ~8ms simulated
  async confirmBet(
    _holdId: string,
  ): Promise<MockApiResponse<{ betId: string }>> {
    console.log(`Mock confirm for hold ${_holdId}`);
    const latency = Math.floor(Math.random() * 5) + 5; // 5-10ms
    await delay(latency);

    return {
      success: true,
      data: {
        betId: `bet_${Math.random().toString(36).substring(7)}`,
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        latencyMs: latency,
      },
    };
  },

  // Mocking the async D1 batch write that happens in the background (slower)
  async simulateAsyncComplianceWrite(): Promise<{
    latencyMs: number;
    success: boolean;
  }> {
    const latency = Math.floor(Math.random() * 50) + 150; // 150-200ms
    await delay(latency);
    return { latencyMs: latency, success: true };
  },
};
