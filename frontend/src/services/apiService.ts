import type {
  ApiResponse,
  LoginRequest,
  BetAuthorizeRequest,
  BetConfirmRequest,
} from "@shared/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

export class ApiService {
  static clearToken() {
    // Left for interface compatibility if anything still calls it (though not strictly needed now as token is a cookie)
    // To properly logout, we would call an endpoint to clear the HttpOnly cookie
  }

  private static async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (
      !response.ok &&
      response.status !== 400 &&
      response.status !== 401 &&
      response.status !== 403
    ) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    // Advisory A-8: Basic shape validation
    if (typeof data !== "object" || data === null || !("success" in data)) {
      throw new Error("Malformed response from server");
    }

    return data as ApiResponse<T>;
  }

  static async login(
    userId: string,
    pin: string,
    cfTurnstileResponse?: string,
  ): Promise<ApiResponse<{ userId: string; balance: number }>> {
    const res = await this.request<{ userId: string; balance: number }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          userId,
          pin,
          cfTurnstileResponse,
          requestId: crypto.randomUUID(),
        } as LoginRequest),
      },
    );

    return res;
  }

  static async authorizeBet(
    userId: string,
    amount: number,
    matchId: string,
  ): Promise<ApiResponse<{ holdId: string; balance: number }>> {
    return this.request<{ holdId: string; balance: number }>(
      "/api/data/bet/authorize",
      {
        method: "POST",
        body: JSON.stringify({
          userId,
          amount,
          matchId,
          requestId: crypto.randomUUID(),
        } as BetAuthorizeRequest),
      },
    );
  }

  static async confirmBet(
    userId: string,
    holdId: string,
  ): Promise<ApiResponse<{ balance: number }>> {
    return this.request<{ balance: number }>("/api/data/bet/confirm", {
      method: "POST",
      body: JSON.stringify({
        userId,
        holdId,
        requestId: crypto.randomUUID(),
      } as BetConfirmRequest),
    });
  }

  static async getAudioToken(): Promise<ApiResponse<{ token: string }>> {
    return this.request<{ token: string }>("/api/ws/audio/token", {
      method: "POST",
    });
  }

  static async getLatencyHistory(): Promise<ApiResponse<unknown>> {
    return this.request<unknown>("/api/data/latency/history");
  }

  static getWebSocketUrl(path: string): string {
    const wsBase = API_BASE.replace(/^http/, "ws");
    return `${wsBase}${path}`;
  }
}
