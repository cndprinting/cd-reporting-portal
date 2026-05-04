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

/**
 * Wrap an email body in a branded MailerCity header + footer shell.
 * Use this on all transactional emails so the C&D MailerCity logo appears
 * consistently. Call sites pass just their content HTML.
 */
export function brandedEmail(content: string, opts?: { previewText?: string }): string {
  const portal = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
  const preview = opts?.previewText ?? "";
  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1814;">
${preview ? `<div style="display:none;max-height:0;overflow:hidden;">${preview}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #E8E0D2;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #E8E0D2;background:#ffffff;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:500;color:#1A1814;letter-spacing:-0.01em;">
          C&amp;D <span style="color:#B85C3D;font-style:italic;">MailerCity</span>
        </div>
      </td></tr>
      <tr><td style="padding:32px;font-size:14px;line-height:1.6;color:#1A1814;">
        ${content}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #E8E0D2;background:#FAF7F2;text-align:center;font-size:11px;color:#6B6660;">
        <a href="${portal}" style="color:#B85C3D;text-decoration:none;">marketing.cndprinting.com</a>
        &nbsp;·&nbsp; C&amp;D Printing &nbsp;·&nbsp; We run your mail marketing
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
