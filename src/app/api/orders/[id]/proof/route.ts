/**
 * Merge proof management.
 * POST /api/orders/:id/proof
 *   Body: { pdfUrl, fileName?, notes? }
 *   - Admin uploads proof (PDF hosted somewhere — Vercel Blob, Dropbox, etc.)
 *   - Sets order status to PROOF_READY
 *   - (TODO) emails customer to review
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/services/email";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const { pdfUrl, fileName, notes } = await req.json();
  if (!pdfUrl) return NextResponse.json({ error: "pdfUrl required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id },
    include: { company: { include: { users: { select: { email: true, name: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Upsert proof
  const proof = await prisma.orderProof.upsert({
    where: { orderId: id },
    create: {
      orderId: id,
      pdfUrl,
      fileName,
      notes,
      uploadedBy: session.id,
    },
    update: { pdfUrl, fileName, notes, uploadedBy: session.id, uploadedAt: new Date() },
  });

  // Advance order to PROOF_READY
  await prisma.order.update({
    where: { id },
    data: { status: "PROOF_READY" },
  });

  // Email the customer — "Your proof is ready, click to review and approve"
  const portalUrl = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
  const reviewUrl = `${portalUrl}/dashboard/orders/${id}`;
  const recipients = order.company.users.map((u) => u.email).filter(Boolean);

  if (recipients.length > 0) {
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
<tr><td style="padding:28px 32px;background:#1e293b;color:#ffffff;">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:4px;">Your Proof is Ready</div>
<div style="font-size:22px;font-weight:700;">${order.orderCode} — ${order.description ?? "Mailing"}</div>
</td></tr>
<tr><td style="padding:32px;font-size:14px;line-height:1.6;">
<p>Your ${order.quantity.toLocaleString()}-piece mailing is ready for review. Please look over the merge proof and approve so we can get it scheduled for mail drop.</p>
<p style="margin:24px 0;"><a href="${reviewUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review &amp; Approve &rarr;</a></p>
<p style="font-size:12px;color:#64748b;">When you approve, the ${order.totalPrice ? `$${order.totalPrice.toFixed(2)}` : "campaign cost"} will be charged to the card on file and we'll schedule the drop immediately.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;">
C&amp;D Printing · ${order.orderCode}
</td></tr>
</table>
</td></tr></table></body></html>`;

    await sendEmail({
      to: recipients,
      subject: `Proof ready for ${order.orderCode} — review & approve`,
      html,
    }).catch((e) => console.error("[order proof email] failed:", e));
  }

  return NextResponse.json({ proof, recipients: recipients.length });
}
