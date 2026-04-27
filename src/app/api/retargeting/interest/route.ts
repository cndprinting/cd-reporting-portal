/**
 * Retargeting interest signals — customer clicks "Notify me when available" on
 * the placeholder upsell card. We log the signal + ping admin email.
 *
 * POST /api/retargeting/interest
 *   body: { product: "website-to-mailbox" | "everywhere", orderId?: string, note?: string }
 *
 * GET  /api/retargeting/interest (admin only)
 *   -> list all pending interest signals
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/services/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });
  if (!session.companyId) {
    return NextResponse.json({ error: "no company on session" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const product: string = body.product ?? "website-to-mailbox";
  if (!["website-to-mailbox", "everywhere"].includes(product)) {
    return NextResponse.json({ error: "invalid product" }, { status: 400 });
  }

  const interest = await prisma.retargetingInterest.create({
    data: {
      companyId: session.companyId,
      userId: session.id,
      product,
      orderId: body.orderId ?? null,
      note: body.note ?? null,
    },
    include: { company: { select: { name: true } } },
  });

  // Ping C&D's sales team so they can follow up
  const salesEmail = process.env.SALES_NOTIFY_EMAIL ?? "bwaxman@cndprinting.com";
  const productLabel =
    product === "everywhere"
      ? "Everywhere (digital ads matching mail list)"
      : "Website to Mailbox (retarget site visitors with postcards)";
  await sendEmail({
    to: [salesEmail],
    subject: `🎯 Retargeting interest — ${interest.company.name}`,
    html: `<!doctype html><html><body style="font-family:-apple-system,sans-serif;font-size:14px;color:#0f172a;line-height:1.6;padding:24px;">
<h2 style="margin:0 0 12px">New retargeting interest</h2>
<p><strong>${interest.company.name}</strong> (user ${session.email}) just clicked "Notify me" on:</p>
<p style="background:#f1f5f9;padding:8px 12px;border-radius:6px;display:inline-block;font-weight:600;">${productLabel}</p>
${body.orderId ? `<p>From order: <code>${body.orderId}</code></p>` : ""}
${body.note ? `<p>Note: ${body.note}</p>` : ""}
<hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0;" />
<p style="font-size:12px;color:#64748b;">View all retargeting interest at <a href="https://marketing.cndprinting.com/dashboard/admin/retargeting-interest">the admin dashboard</a>.</p>
</body></html>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: interest.id });
}

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const items = await prisma.retargetingInterest.findMany({
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items });
}
