/**
 * Custom Quote workflow actions for an order.
 *
 * POST /api/orders/:id/quote
 *   body:
 *     action: "provide" | "accept" | "reject"
 *
 *     For "provide" (admin):
 *       pricePerPiece: number, setupFee: number, notes?: string
 *
 *     For "accept" (customer):
 *       (no extra fields)
 *
 *     For "reject" (customer):
 *       reason?: string
 *
 * State machine:
 *   QUOTE_REQUESTED + provide → QUOTE_PROVIDED (admin sets price, customer notified)
 *   QUOTE_PROVIDED  + accept  → IN_PREP        (customer approved, normal flow continues)
 *   QUOTE_PROVIDED  + reject  → QUOTE_REJECTED (customer declined; tracked for analytics)
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
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();
  const action: "provide" | "accept" | "reject" = body.action;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { company: { include: { users: { select: { email: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!order.isCustomQuote) {
    return NextResponse.json({ error: "not a custom-quote order" }, { status: 400 });
  }

  // Customers can only act on their own company's orders
  if (session.role === "CUSTOMER" && order.companyId !== session.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const portalUrl = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";

  if (action === "provide") {
    if (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER") {
      return NextResponse.json({ error: "admin only" }, { status: 403 });
    }
    if (order.status !== "QUOTE_REQUESTED") {
      return NextResponse.json(
        { error: `order must be QUOTE_REQUESTED, currently ${order.status}` },
        { status: 409 },
      );
    }
    const pricePerPiece = Number(body.pricePerPiece);
    const setupFee = Number(body.setupFee ?? 0);
    if (!Number.isFinite(pricePerPiece) || pricePerPiece <= 0) {
      return NextResponse.json({ error: "valid pricePerPiece required" }, { status: 400 });
    }
    const totalPrice = +(pricePerPiece * order.quantity + setupFee).toFixed(2);
    await prisma.order.update({
      where: { id },
      data: {
        pricePerPiece,
        setupFee,
        totalPrice,
        status: "QUOTE_PROVIDED",
        customQuoteProvidedAt: new Date(),
        customQuoteProvidedBy: session.id,
      },
    });

    // Email the customer
    const recipients = order.company.users.map((u) => u.email).filter(Boolean);
    if (recipients.length > 0) {
      const html = `<!doctype html><html><body style="font-family:-apple-system,sans-serif;font-size:14px;color:#0f172a;line-height:1.6;padding:24px;background:#f8fafc;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
<div style="padding:24px 28px;background:#8b5cf6;color:#fff;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#e9d5ff;">Quote Ready</div>
<div style="font-size:22px;font-weight:700;margin-top:4px;">${order.orderCode}</div>
</div>
<div style="padding:28px;">
<p>Your custom quote is ready to review.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Quantity</td><td style="text-align:right;font-weight:600;">${order.quantity.toLocaleString()}</td></tr>
<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Price per piece</td><td style="text-align:right;font-weight:600;">$${pricePerPiece.toFixed(2)}</td></tr>
${setupFee > 0 ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Setup fee</td><td style="text-align:right;font-weight:600;">$${setupFee.toFixed(2)}</td></tr>` : ""}
<tr style="border-top:1px solid #e2e8f0;"><td style="padding:10px 0 6px;font-weight:600;">Total</td><td style="text-align:right;font-weight:700;font-size:18px;">$${totalPrice.toFixed(2)}</td></tr>
</table>
${body.notes ? `<div style="background:#f5f3ff;border-left:3px solid #8b5cf6;padding:12px;border-radius:4px;font-size:13px;white-space:pre-wrap;margin:12px 0;"><strong>Notes:</strong>\n${String(body.notes).slice(0, 1500)}</div>` : ""}
<p style="margin:20px 0;text-align:center;"><a href="${portalUrl}/dashboard/orders/${order.id}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Review &amp; Accept Quote →</a></p>
<p style="font-size:12px;color:#64748b;">No charge until you accept the quote and approve the proof.</p>
</div></div></body></html>`;
      await sendEmail({
        to: recipients,
        subject: `${order.orderCode} — your custom quote is ready`,
        html,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, totalPrice });
  }

  if (action === "accept") {
    if (order.status !== "QUOTE_PROVIDED") {
      return NextResponse.json(
        { error: `order must be QUOTE_PROVIDED, currently ${order.status}` },
        { status: 409 },
      );
    }
    await prisma.order.update({
      where: { id },
      data: { status: "IN_PREP" },
    });
    // Now that the customer accepted, fire the production handoff email
    // (only if the order has a list attached — sometimes custom-quote
    // orders are pure pricing exploration with no list yet)
    if (order.mailingListUrl) {
      const { notifyProduction } = await import("@/lib/services/production-notify");
      notifyProduction(id).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    if (order.status !== "QUOTE_PROVIDED") {
      return NextResponse.json(
        { error: `order must be QUOTE_PROVIDED, currently ${order.status}` },
        { status: 409 },
      );
    }
    await prisma.order.update({
      where: { id },
      data: {
        status: "QUOTE_REJECTED",
        customQuoteRejectedAt: new Date(),
        customQuoteRejectReason: body.reason ?? null,
      },
    });
    // Notify admin so they can follow up
    const adminEmails = (process.env.SALES_NOTIFY_EMAIL ?? "bwaxman@cndprinting.com")
      .split(",").map((s) => s.trim()).filter(Boolean);
    await sendEmail({
      to: adminEmails,
      subject: `Quote declined — ${order.company.name} (${order.orderCode})`,
      html: `<p>${order.company.name} declined the custom quote on <code>${order.orderCode}</code>.</p>${body.reason ? `<p><strong>Reason:</strong> ${String(body.reason).slice(0, 500)}</p>` : ""}<p><a href="${portalUrl}/dashboard/orders/${order.id}">View order →</a></p>`,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
