import { Env } from "../worker";
import { CONFIG } from "@shared/constants";

export class GlobalGovernor implements DurableObject {
  private dailyCount: number = 0;
  private monthlyCount: number = 0;
  private currentDay: string = "";
  private currentMonth: string = "";

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {
    this.state.blockConcurrencyWhile(async () => {
      this.dailyCount =
        (await this.state.storage.get<number>("dailyCount")) || 0;
      this.monthlyCount =
        (await this.state.storage.get<number>("monthlyCount")) || 0;
      this.currentDay =
        (await this.state.storage.get<string>("currentDay")) || this.getToday();
      this.currentMonth =
        (await this.state.storage.get<string>("currentMonth")) ||
        this.getMonth();
    });
  }

  private getToday() {
    return new Date().toISOString().split("T")[0];
  }
  private getMonth() {
    return new Date().toISOString().substring(0, 7);
  }

  async fetch(request: Request): Promise<Response> {
    const today = this.getToday();
    const month = this.getMonth();

    if (this.currentDay !== today) {
      this.dailyCount = 0;
      this.currentDay = today;
      await this.state.storage.put("currentDay", today);
      await this.state.storage.put("dailyCount", 0);

      // Reset lockdown on daily reset
      await this.env.GOVERNOR_KV.delete("governor:lockdown");
    }

    if (this.currentMonth !== month) {
      this.monthlyCount = 0;
      this.currentMonth = month;
      await this.state.storage.put("currentMonth", month);
      await this.state.storage.put("monthlyCount", 0);
    }

    this.dailyCount++;
    this.monthlyCount++;

    if (
      this.dailyCount >= CONFIG.GOVERNOR_DAILY_LIMIT ||
      this.monthlyCount >= CONFIG.GOVERNOR_MONTHLY_LIMIT
    ) {
      // Engage lockdown in KV (L1 Check)
      await this.env.GOVERNOR_KV.put("governor:lockdown", "true", {
        expirationTtl: CONFIG.GOVERNOR_LOCKDOWN_TTL,
      });
    }

    // Persist counters sequentially
    await this.state.storage.put({
      dailyCount: this.dailyCount,
      monthlyCount: this.monthlyCount,
    });

    return new Response("OK");
  }
}
