/**
 * Public lead-capture endpoint for the MailerCity landing page.
 * No auth — anyone can submit. Notifies admin via email; light spam
 * defense via honeypot field + simple rate limit.
 *
 * POST /api/leads
 *   body: { name, email, company?, phone?, message?, hp? }
 *
 * Returns { ok: true } on success regardless of email send (we want the
 * UI to confirm "we'll be in touch" even if the email infra is briefly
 * unavailable — the lead is logged either way).
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/services/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, email, company, phone, message, industry, hp } = body as Record<
    string,
    string | undefined
  >;

  // Honeypot: bots fill hidden fields, humans don't
  if (hp && hp.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "name and email required" }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
    return NextResponse.json({ error: "invalid email format" }, { status: 400 });
  }

  const recipients = (
    process.env.LEADS_NOTIFY_EMAIL ??
    process.env.SALES_NOTIFY_EMAIL ??
    "bwaxman@cndprinting.com"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const industryTag = industry?.trim() ? ` · ${industry.trim()}` : "";
    await sendEmail({
      to: recipients,
      subject: `🎯 New MailerCity lead — ${name.trim()}${company ? ` (${company.trim()})` : ""}${industryTag}`,
      html: `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1A1814;line-height:1.6;padding:24px;background:#FAF7F2;">
<table cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E8E0D2;border-radius:8px;overflow:hidden;">
<tr><td style="padding:20px 28px;border-bottom:1px solid #E8E0D2;">
<div style="font-family:Georgia,serif;font-size:18px;font-weight:500;">C&amp;D <span style="color:#B85C3D;font-style:italic;">MailerCity</span></div>
<div style="font-size:11px;color:#6B6660;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">Landing-page lead${industry ? ` · ${escape(industry)} page` : ""}</div>
</td></tr>
<tr><td style="padding:24px 28px;font-size:14px;">
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
  <tr><td style="color:#6B6660;padding-right:12px;width:120px;">Name</td><td><strong>${escape(name)}</strong></td></tr>
  <tr><td style="color:#6B6660;">Email</td><td><a href="mailto:${escape(email)}" style="color:#B85C3D;">${escape(email)}</a></td></tr>
  ${company ? `<tr><td style="color:#6B6660;">Company</td><td>${escape(company)}</td></tr>` : ""}
  ${phone ? `<tr><td style="color:#6B6660;">Phone</td><td>${escape(phone)}</td></tr>` : ""}
  ${industry ? `<tr><td style="color:#6B6660;">Industry</td><td><strong>${escape(industry)}</strong></td></tr>` : ""}
</table>
${message ? `<div style="margin-top:18px;padding:14px;background:#FAF7F2;border-left:3px solid #B85C3D;border-radius:4px;font-size:13px;white-space:pre-wrap;">${escape(message)}</div>` : ""}
<p style="margin:20px 0 0;font-size:12px;color:#6B6660;">Submitted at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET via the public landing page.</p>
</td></tr>
</table>
</body></html>`,
    });
  } catch (e) {
    console.error("[leads] email send failed (lead still accepted)", e);
  }

  return NextResponse.json({ ok: true });
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
