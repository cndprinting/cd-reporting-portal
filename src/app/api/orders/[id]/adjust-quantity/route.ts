/**
 * Adjust an Order's final quantity after AccuZIP CASS/NCOA cleansing.
 *
 * POST /api/orders/:id/adjust-quantity
 *   body:
 *     finalQuantity          number   (required)
 *     cleansedListUrl        string   (optional)
 *     cleansedListFileName   string   (optional)
 *     cleansedListRowCount   number   (optional; defaults to finalQuantity)
 *
 * Side effects:
 *   - Recomputes finalTotalPrice = finalQuantity * pricePerPiece + (setupFee ?? 0)
 *   - If order is already paid (paidAt set) AND finalTotalPrice < totalPrice,
 *     fires a Stripe partial refund for the difference and stores
 *     stripeRefundId + stripeRefundAmount.
 *   - Emails the customer a "your campaign was optimized" notification.
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/services/email";

export const runtime = "nodejs";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

async function stripeRefund(
  paymentIntentId: string,
  amountCents: number,
): Promise<{ id: string } | { error: string }> {
  if (!STRIPE_KEY) return { error: "Stripe not configured" };
  const body = new URLSearchParams();
  body.set("payment_intent", paymentIntentId);
  body.set("amount", String(amountCents));
  body.set("reason", "duplicate"); // closest Stripe reason for "address cleansing removed duplicates"
  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const d = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok) return { error: d.error?.message ?? "Stripe refund failed" };
  return { id: d.id as string };
}

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
  const body = await req.json();
  const finalQuantity = Number(body.finalQuantity);
  if (!Number.isFinite(finalQuantity) || finalQuantity < 0) {
    return NextResponse.json({ error: "finalQuantity must be a non-negative number" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { company: { include: { users: { select: { email: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (finalQuantity > order.quantity) {
    return NextResponse.json(
      {
        error: `finalQuantity (${finalQuantity}) cannot exceed original quantity (${order.quantity}). If more pieces need to mail, create a follow-up order.`,
      },
      { status: 400 },
    );
  }

  const pricePerPiece = order.pricePerPiece ?? 0;
  const setupFee = order.setupFee ?? 0;
  const finalTotalPrice = +(finalQuantity * pricePerPiece + setupFee).toFixed(2);

  // Compute refund — only if previously paid a positive amount AND the new total is lower
  let refundId: string | null = null;
  let refundAmount: number | null = null;
  const originalTotal = order.totalPrice ?? 0;
  const refundNeeded = +(originalTotal - finalTotalPrice).toFixed(2);

  if (order.paidAt && order.stripePaymentIntentId && refundNeeded > 0.01) {
    const result = await stripeRefund(
      order.stripePaymentIntentId,
      Math.round(refundNeeded * 100),
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: `Quantity recorded but refund failed: ${result.error}` },
        { status: 502 },
      );
    }
    refundId = result.id;
    refundAmount = refundNeeded;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      finalQuantity,
      finalTotalPrice,
      quantityAdjustedAt: new Date(),
      quantityAdjustedBy: session.id,
      cleansedListUrl: body.cleansedListUrl ?? order.cleansedListUrl,
      cleansedListFileName: body.cleansedListFileName ?? order.cleansedListFileName,
      cleansedListRowCount: body.cleansedListRowCount ?? finalQuantity,
      cleansedListUploadedAt: body.cleansedListUrl ? new Date() : order.cleansedListUploadedAt,
      stripeRefundId: refundId ?? order.stripeRefundId,
      stripeRefundAmount: refundAmount ?? order.stripeRefundAmount,
    },
  });

  // Customer-facing email — only if there was an actual adjustment
  const recipients = order.company.users.map((u) => u.email).filter(Boolean);
  if (recipients.length > 0 && finalQuantity < order.quantity) {
    const portalUrl = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
    const removedCount = order.quantity - finalQuantity;
    const refundLine = refundAmount
      ? `<p style="font-size:16px;font-weight:600;color:#059669;">We've refunded you $${refundAmount.toFixed(2)}.</p>`
      : "";
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
<tr><td style="padding:28px 32px;background:#0ea5e9;color:#ffffff;">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#bae6fd;margin-bottom:4px;">Campaign Optimized</div>
<div style="font-size:22px;font-weight:700;">${order.orderCode}</div>
</td></tr>
<tr><td style="padding:32px;font-size:14px;line-height:1.6;">
<p>We ran your mailing list through USPS CASS certification and NCOA (National Change of Address).</p>
<p>Of the <strong>${order.quantity.toLocaleString()}</strong> addresses you uploaded, <strong>${finalQuantity.toLocaleString()}</strong> passed validation and will be mailed. The remaining <strong>${removedCount.toLocaleString()}</strong> were duplicates, undeliverable, or moved with no forwarding.</p>
${refundLine}
<p>Unlike most direct-mail vendors, we only charge for pieces that actually drop — so you keep the difference.</p>
<p style="margin:24px 0;"><a href="${portalUrl}/dashboard/orders/${order.id}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Order &rarr;</a></p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;">
C&amp;D Printing · ${order.orderCode} · ${new Date().toLocaleDateString()}
</td></tr>
</table>
</td></tr></table></body></html>`;
    await sendEmail({
      to: recipients,
      subject: `${order.orderCode} — optimized to ${finalQuantity.toLocaleString()} pieces`,
      html,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    finalQuantity: updated.finalQuantity,
    finalTotalPrice: updated.finalTotalPrice,
    refundId: updated.stripeRefundId,
    refundAmount: updated.stripeRefundAmount,
  });
}
