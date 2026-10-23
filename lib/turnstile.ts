import "server-only";

/**
 * Verifies a Cloudflare Turnstile token. Skipped unless both keys are set:
 * without the site key no widget renders, so there would never be a token.
 */
export async function verifyTurnstile(token: FormDataEntryValue | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY not set — skipping verification");
    return true;
  }
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    console.warn("[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY not set — no widget is shown, skipping verification");
    return true;
  }
  if (typeof token !== "string" || !token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success;
  } catch (error) {
    console.error("[turnstile] verification request failed", error);
    return false;
  }
}
