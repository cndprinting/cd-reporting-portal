/**
 * Bulk-invite endpoint — creates a Company + InviteToken per row in one shot.
 * Built for onboarding groups of independent customers (e.g. 23 land
 * wholesalers from Aaron's network — each is their own peer Company).
 *
 * POST /api/admin/bulk-invite
 *   body: {
 *     rows: Array<{ name: string; email: string; companyName?: string }>,
 *     enabledModules?: string[],   // e.g. ["land-investor"] — applied to every Company
 *     sendEmails?: boolean,         // default true; false = create + return links only
 *   }
 *
 * Response:
 *   {
 *     created: Array<{ name, email, companyId, companyName, inviteUrl, emailSent, error? }>,
 *     summary: { ok, failed }
 *   }
 *
 * Idempotent on email — if a user with that email already exists, that row
 * is skipped with an error message instead of failing the whole batch.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/services/email";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 120;

interface InviteRow {
  name: string;
  email: string;
  companyName?: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function welcomeEmailHtml(inviteUrl: string, name: string, companyName: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1A1814;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;background:#FAF7F2;">
 <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E8E0D2;border-radius:8px;overflow:hidden;">
   <tr><td style="padding:24px 32px;border-bottom:1px solid #E8E0D2;text-align:center;">
    <div style="font-family:Georgia,serif;font-size:22px;font-weight:500;color:#1A1814;letter-spacing:-0.01em;">
      C&amp;D <span style="color:#B85C3D;font-style:italic;">MailerCity</span>
    </div>
    <div style="font-size:11px;color:#6B6660;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">
      We run your mail marketing
    </div>
   </td></tr>
   <tr><td style="padding:32px;font-size:14px;line-height:1.6;">
    <p style="margin:0 0 14px;font-size:18px;font-weight:600;">Welcome, ${name}.</p>
    <p style="margin:0 0 14px;">Your C&amp;D MailerCity account for <strong>${companyName}</strong> is ready. This is the platform for running your land mailing campaigns end-to-end — upload your owner list, pick your mailer size, and get tracking down to each piece.</p>
    <p style="margin:0 0 20px;">Click below to set your password and log in. This invite expires in 14 days.</p>
    <p style="margin:24px 0;">
     <a href="${inviteUrl}" style="display:inline-block;background:#B85C3D;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Set up my account &rarr;</a>
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#3A352D;">
      <strong>What you'll find inside:</strong>
    </p>
    <ul style="font-size:13px;color:#3A352D;line-height:1.7;padding-left:20px;">
      <li>Drag-and-drop upload for owner lists with APN / acreage / county fields</li>
      <li>Standard rate-card pricing — no quote needed for stock sizes</li>
      <li>Live USPS scan tracking down to each piece</li>
      <li>Built-in offer pricing (single, range, or no-offer mailers)</li>
    </ul>
    <p style="margin:24px 0 0;font-size:12px;color:#6B6660;">Or paste this link into your browser:<br/><a href="${inviteUrl}" style="color:#B85C3D;word-break:break-all;">${inviteUrl}</a></p>
   </td></tr>
   <tr><td style="padding:16px 32px;background:#FAF7F2;color:#6B6660;font-size:11px;border-top:1px solid #E8E0D2;text-align:center;">
    marketing.cndprinting.com &nbsp;·&nbsp; C&amp;D Printing &nbsp;·&nbsp; We run your mail marketing
   </td></tr>
  </table>
 </td></tr>
</table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const body = await req.json();
  const rows: InviteRow[] = body.rows ?? [];
  const enabledModules: string[] = body.enabledModules ?? [];
  const sendEmails: boolean = body.sendEmails !== false;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows[] is required" }, { status: 400 });
  }
  if (rows.length > 100) {
    return NextResponse.json({ error: "Max 100 rows per batch" }, { status: 400 });
  }

  const baseUrl =
    process.env.PORTAL_URL ||
    process.env.NEXTAUTH_URL ||
    req.nextUrl.origin;

  const created: Array<{
    name: string;
    email: string;
    companyId?: string;
    companyName?: string;
    inviteUrl?: string;
    emailSent?: boolean;
    error?: string;
  }> = [];

  for (const row of rows) {
    const trimmedEmail = (row.email ?? "").trim().toLowerCase();
    const trimmedName = (row.name ?? "").trim();
    if (!trimmedEmail || !trimmedName) {
      created.push({
        name: trimmedName,
        email: trimmedEmail,
        error: "Missing name or email",
      });
      continue;
    }

    try {
      // Skip if user already exists
      const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (existing) {
        created.push({
          name: trimmedName,
          email: trimmedEmail,
          error: "User with this email already exists",
        });
        continue;
      }

      // Resolve company name + dedupe slug
      const baseCompanyName = (row.companyName?.trim()) || `${trimmedName} Land`;
      let slug = slugify(baseCompanyName);
      let attempt = 0;
      while (await prisma.company.findUnique({ where: { slug } })) {
        attempt++;
        slug = `${slugify(baseCompanyName)}-${attempt}`;
        if (attempt > 20) break;
      }

      const company = await prisma.company.create({
        data: {
          name: baseCompanyName,
          slug,
          isActive: true,
          enabledModules,
        },
      });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      await prisma.inviteToken.create({
        data: {
          email: trimmedEmail,
          token,
          role: "CUSTOMER",
          companyId: company.id,
          expiresAt,
          createdBy: session.id,
        },
      });

      const inviteUrl = `${baseUrl}/invite/${token}`;

      let emailSent = false;
      if (sendEmails) {
        const r = await sendEmail({
          to: trimmedEmail,
          subject: `Welcome to C&D MailerCity, ${trimmedName.split(" ")[0]}`,
          html: welcomeEmailHtml(inviteUrl, trimmedName, baseCompanyName),
        });
        emailSent = r.ok;
      }

      created.push({
        name: trimmedName,
        email: trimmedEmail,
        companyId: company.id,
        companyName: baseCompanyName,
        inviteUrl,
        emailSent,
      });
    } catch (e) {
      created.push({
        name: trimmedName,
        email: trimmedEmail,
        error: (e as Error).message,
      });
    }
  }

  const ok = created.filter((r) => !r.error).length;
  const failed = created.length - ok;

  return NextResponse.json({
    created,
    summary: { ok, failed, total: created.length },
  });
}
