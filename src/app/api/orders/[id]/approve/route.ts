/**
 * Customer approves their Order.
 * POST /api/orders/:id/approve
 *
 * Auth: CUSTOMER user on the order's company, OR ADMIN
 *
 * Flow:
 *   1. Verify order is in PROOF_READY
 *   2. Record approval (audit: who, when, IP, UA)
 *   3. Charge card-on-file via Stripe (if Stripe configured)
 *   4. Move status to APPROVED
 *   5. Email the rep that payment captured
 *
 * Stripe: if STRIPE_SECRET_KEY not set, we skip the charge but still advance
 * to APPROVED (for pilot before Stripe is wired up).
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { company: true, approval: true },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Authorization — customers only for their own company, admins can approve for anyone
  if (session.role === "CUSTOMER" && order.companyId !== session.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (order.approval) {
    return NextResponse.json({ error: "already approved" }, { status: 409 });
  }
  if (order.status !== "PROOF_READY") {
    return NextResponse.json(
      { error: `order must be in PROOF_READY status, currently ${order.status}` },
      { status: 409 },
    );
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  // --- If order is drawn from a MailPackage, decrement that instead of charging Stripe ---
  let stripeChargeId: string | null = null;
  let stripePaymentIntentId: string | null = null;
  let drewFromPackage = false;

  if (order.packageId) {
    const pkg = await prisma.mailPackage.findUnique({ where: { id: order.packageId } });
    if (!pkg) {
      return NextResponse.json({ error: "linked package not found" }, { status: 409 });
    }
    const remaining = pkg.totalPieces - pkg.usedPieces;
    if (remaining < order.quantity) {
      return NextResponse.json(
        {
          error: `package has only ${remaining.toLocaleString()} pieces left, order needs ${order.quantity.toLocaleString()}`,
        },
        { status: 409 },
      );
    }
    // Write drawdown + increment usedPieces atomically
    await prisma.$transaction([
      prisma.packageDrawdown.create({
        data: {
          packageId: pkg.id,
          orderId: order.id,
          pieces: order.quantity,
          note: `Order ${order.orderCode} approved`,
        },
      }),
      prisma.mailPackage.update({
        where: { id: pkg.id },
        data: {
          usedPieces: { increment: order.quantity },
          status:
            pkg.usedPieces + order.quantity >= pkg.totalPieces ? "EXHAUSTED" : pkg.status,
        },
      }),
    ]);
    drewFromPackage = true;
  }

  // --- Otherwise attempt Stripe charge on card on file ---
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!drewFromPackage && stripeSecret && order.totalPrice && order.company.stripeCustomerId) {
    try {
      const params = new URLSearchParams({
        customer: order.company.stripeCustomerId,
        amount: String(Math.round(order.totalPrice * 100)),
        currency: "usd",
        confirm: "true",
        off_session: "true",
        description: `${order.orderCode} — ${order.description ?? "Mailing"}`,
        "metadata[orderId]": order.id,
        "metadata[orderCode]": order.orderCode,
      });
      const r = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data = await r.json();
      if (!r.ok) {
        console.error("[order approve] Stripe error", data);
        return NextResponse.json(
          { error: `Payment failed: ${data.error?.message ?? "unknown"}` },
          { status: 402 },
        );
      }
      stripePaymentIntentId = data.id;
      stripeChargeId = data.latest_charge ?? null;
    } catch (e) {
      console.error("[order approve] Stripe call failed", e);
      return NextResponse.json(
        { error: "Payment processing failed, please try again" },
        { status: 502 },
      );
    }
  }

  // --- Persist approval ---
  const approval = await prisma.orderApproval.create({
    data: {
      orderId: order.id,
      approvedByUserId: session.id,
      approvedByName: session.name,
      stripeChargeId,
      stripePaymentIntentId,
      amountCharged: order.totalPrice ?? 0,
      ipAddress,
      userAgent,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "APPROVED",
      paidAt: stripeChargeId ? new Date() : null,
      stripePaymentIntentId,
    },
  });

  return NextResponse.json({
    ok: true,
    approval,
    paymentCaptured: !!stripeChargeId,
    drewFromPackage,
  });
}
