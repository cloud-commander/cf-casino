/**
 * Verifies a Cloudflare Turnstile token.
 *
 * @param secretKey The secret key for your Turnstile widget.
 * @param response The token provided by the client's Turnstile widget.
 * @param remoteIp The IP address of the client (optional but recommended).
 * @returns boolean indicating if the token is valid.
 */
export async function verifyTurnstile(
  secretKey: string,
  response?: string,
  remoteIp?: string,
): Promise<boolean> {
  // If no response is provided, it's an automatic fail in production
  if (!response) {
    return false;
  }

  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", response);
  if (remoteIp) {
    formData.append("remoteip", remoteIp);
  }

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

  try {
    const result = await fetch(url, {
      body: formData,
      method: "POST",
    });

    const outcome = (await result.json()) as { success: boolean };
    return outcome.success;
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return false;
  }
}
