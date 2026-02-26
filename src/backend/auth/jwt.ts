import * as jose from "jose";
import { SessionPayload, SessionPayloadSchema } from "@shared/types";

export async function signJwt(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  // Using JWTPayload, we map our session payload to what Jose expects
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(payload.iat)
    .setExpirationTime(payload.exp)
    .sign(secretKey);
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);

    // Advisory A-4: Validate the payload structure to ensure data integrity
    const parsed = SessionPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("[JWT] Payload validation failed:", parsed.error.issues);
      return null;
    }

    return parsed.data;
  } catch (e) {
    return null;
  }
}
