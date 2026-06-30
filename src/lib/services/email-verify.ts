/**
 * Email verification helpers — MX lookup + sending the verification email.
 *
 * We don't try to "block free email providers" (Gmail/Yahoo etc. are valid
 * customers — Aaron is on Gmail). Instead we check the domain actually
 * receives mail (has an MX record). Filters out junk like fake@asdf.xyz
 * without blocking legit customers.
 */

import { promises as dns } from "node:dns";
import { randomUUID } from "node:crypto";
import { sendEmail } from "./email";

/** Returns true if the email's domain has at least one MX record. */
export async function emailDomainHasMx(email: string): Promise<boolean> {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  // Reject obviously malformed domains before hitting DNS.
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
  try {
    const records = await dns.resolveMx(domain);
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

/** Generate a fresh verification token + 24h expiry. */
export function newVerifyToken(): { token: string; expiresAt: Date } {
  return {
    token: randomUUID(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

/** Send the verification link to a newly-created or re-requesting user. */
export async function sendVerificationEmail(args: {
  to: string;
  name: string;
  token: string;
}): Promise<{ ok: boolean; error?: string }> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://marketing.cndprinting.com";
  const link = `${base}/verify?token=${encodeURIComponent(args.token)}`;
  const html = `
<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
  <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#B85042;font-weight:600;">MailerCity</div>
  <h1 style="font-family:Georgia,serif;font-size:28px;margin:8px 0 18px;">Confirm your email</h1>
  <p style="font-size:15px;line-height:1.55;color:#1a1a1a;">Hi ${escapeHtml(args.name)},</p>
  <p style="font-size:15px;line-height:1.55;color:#1a1a1a;">
    Welcome to MailerCity. Click the button below to confirm <strong>${escapeHtml(args.to)}</strong>
    and finish setting up your account.
  </p>
  <p style="margin:28px 0;">
    <a href="${link}"
       style="display:inline-block;background:#B85042;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-family:-apple-system,Segoe UI,sans-serif;">
      Confirm my email
    </a>
  </p>
  <p style="font-size:13px;line-height:1.55;color:#6b6b6b;">
    Or paste this link in your browser:<br/>
    <span style="word-break:break-all;color:#444;">${link}</span>
  </p>
  <p style="font-size:12px;color:#6b6b6b;margin-top:32px;">
    The link expires in 24 hours. If you didn&rsquo;t create a MailerCity account, ignore this email.
  </p>
  <hr style="border:none;border-top:1px solid #e0d6c8;margin:28px 0;" />
  <p style="font-size:11px;color:#999;">
    MailerCity by C&amp;D Printing &middot; St. Petersburg, FL &middot; (727) 572-9999
  </p>
</div>`;
  return sendEmail({
    to: args.to,
    subject: "Confirm your MailerCity email",
    html,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
