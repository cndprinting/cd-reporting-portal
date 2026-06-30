/**
 * Cloudflare Turnstile verification helper.
 * Only enforced when TURNSTILE_SECRET is set. Fails open on transient errors
 * so a CAPTCHA outage doesn't lock users out of the funnel.
 *
 * Env: TURNSTILE_SECRET (server) + NEXT_PUBLIC_TURNSTILE_SITE_KEY (client widget).
 */

export async function verifyTurnstile(
  token: string | undefined,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return { ok: true }; // not configured = no enforcement
  if (!token) return { ok: false, reason: "captcha required" };
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as { success: boolean };
    if (!data.success) return { ok: false, reason: "captcha failed" };
    return { ok: true };
  } catch (e) {
    console.warn("[captcha] turnstile verify error, failing open", e);
    return { ok: true };
  }
}
