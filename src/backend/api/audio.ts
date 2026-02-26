import { Env } from "../worker";
import { SessionPayload, ApiResponse } from "@shared/types";

export async function handleAudioToken(
  request: Request,
  env: Env,
  auth: SessionPayload,
): Promise<Response> {
  // ------------------------------------------
  // PRODUCTION REALTIMEKIT EXCHANGE (§15.8)
  // ------------------------------------------
  if (
    env.ENVIRONMENT === "production" &&
    env.CF_API_TOKEN &&
    env.ACCOUNT_ID &&
    env.REALTIME_KIT_APP_ID
  ) {
    try {
      // Exchange session for a WebRTC Participant Token in the RealtimeKit app
      // We use the persistent Meeting UUID for the casino main table.
      const rtkResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/realtime/kit/${env.REALTIME_KIT_APP_ID}/meetings/bbbced39-165f-4771-aed5-cf4892069118/participants`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.CF_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Required: unique identifier for this participant session
            customParticipantId: auth.userId,
            // Optional: human-readable display name in the audio room
            name: `Player ${auth.userId.split("_")[1] ?? auth.userId}`,
            // Full duplex: players can speak and hear the dealer
            presetName: "group_call_host",
          }),
        },
      );

      if (rtkResponse.ok) {
        const body = (await rtkResponse.json()) as {
          data: { token: string };
        };
        return new Response(
          JSON.stringify({
            success: true,
            data: { token: body.data.token },
            meta: { requestId: crypto.randomUUID(), timestamp: Date.now() },
          } satisfies ApiResponse),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const errorText = await rtkResponse.text();
      console.error(
        "RealtimeKit Exchange failed:",
        rtkResponse.status,
        errorText,
      );

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "REALTIME_EXCHANGE_FAILED",
            message: `Cloudflare RealtimeKit API error: ${rtkResponse.status}`,
          },
          meta: { requestId: crypto.randomUUID(), timestamp: Date.now() },
        }),
        {
          status: rtkResponse.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (err) {
      console.error("RealtimeKit Network Error:", err);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to negotiate audio",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Fallback for Development: Simulated Token
  const mockToken = `rtk_mock_${crypto.randomUUID()}_${auth.userId}`;
  return new Response(
    JSON.stringify({
      success: true,
      data: { token: mockToken },
      meta: { requestId: crypto.randomUUID(), timestamp: Date.now() },
    } satisfies ApiResponse),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
