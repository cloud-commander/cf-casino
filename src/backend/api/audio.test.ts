import { describe, it, expect } from "vitest";
import { handleAudioToken } from "./audio";
import { Env } from "../worker";
import { SessionPayload } from "@shared/types";

describe("Audio API", () => {
  it("should generate a mock participant token", async () => {
    const env = {} as Env;
    const auth: SessionPayload = {
      userId: "user-test",
      sessionId: "session-test",
      iat: 123,
      exp: 456,
    };
    const request = new Request("http://api/audio/token", { method: "POST" });

    const response = await handleAudioToken(request, env, auth);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.token).toContain("rtk_");
    expect(data.data.token).toContain("user-test");
  });
});
