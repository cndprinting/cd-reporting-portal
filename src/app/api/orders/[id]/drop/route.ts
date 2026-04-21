/**
 * Mark an Order as dropped (handed to USPS).
 * POST /api/orders/:id/drop
 *
 * Admin action. Triggers:
 *   - Status → DROPPED
 *   - droppedAt timestamp
 *   - "Your campaign is in mailboxes" email to customer (branded)
 *   - Logged in DropNotification table
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/services/email";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { company: { include: { users: { select: { email: true, name: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (order.status === "DROPPED" || order.status === "DELIVERING" || order.status === "COMPLETE") {
    return NextResponse.json({ error: "order already dropped or further" }, { status: 409 });
  }

  await prisma.order.update({
    where: { id },
    data: { status: "DROPPED", droppedAt: new Date() },
  });

  const portalUrl = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
  const trackingUrl = `${portalUrl}/dashboard/orders/${id}`;
  const recipients = order.company.users.map((u) => u.email).filter(Boolean);

  let sentOk = false;
  let sendError: string | undefined;

  if (recipients.length > 0) {
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
<tr><td style="padding:28px 32px;background:#10b981;color:#ffffff;">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#d1fae5;margin-bottom:4px;">Mail Dropped</div>
<div style="font-size:22px;font-weight:700;">${order.orderCode} is on its way</div>
</td></tr>
<tr><td style="padding:32px;font-size:14px;line-height:1.6;">
<p>Great news — your ${order.quantity.toLocaleString()}-piece mailing was handed to USPS today.</p>
<p>Expect the first delivery scans within 24&ndash;48 hours and full in-home delivery within 5&ndash;7 business days for First-Class, or 7&ndash;14 days for Marketing Mail.</p>
<p>You can track piece-level progress any time in your portal:</p>
<p style="margin:24px 0;"><a href="${trackingUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Track Your Campaign &rarr;</a></p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;">
C&amp;D Printing · ${order.orderCode} · ${new Date().toLocaleDateString()}
</td></tr>
</table>
</td></tr></table></body></html>`;

    const send = await sendEmail({
      to: recipients,
      subject: `${order.orderCode} is in the mail`,
      html,
    });
    sentOk = send.ok;
    sendError = send.error;

    await prisma.dropNotification.create({
      data: {
        orderId: order.id,
        recipients: recipients.join(","),
        status: send.ok ? "sent" : "failed",
        errorMessage: send.error,
      },
    });
  }

  return NextResponse.json({ ok: true, emailed: recipients.length, sentOk, sendError });
}
