/**
 * Thin Resend API wrapper. No SDK — just fetch.
 * Env: RESEND_API_KEY, EMAIL_FROM (e.g. "C&D Printing <reports@cndprinting.com>")
 */

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

  const from = params.from ?? process.env.EMAIL_FROM ?? "C&D Reports <onboarding@resend.dev>";

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      reply_to: params.replyTo,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { ok: false, error: `Resend ${resp.status}: ${text}` };
  }
  const data = (await resp.json()) as { id: string };
  return { ok: true, id: data.id };
}
