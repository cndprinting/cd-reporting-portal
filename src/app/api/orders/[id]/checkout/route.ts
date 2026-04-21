/**
 * Stripe Checkout session for an Order.
 *
 * POST /api/orders/:id/checkout
 *   Creates a Stripe Checkout Session and returns its URL. Client redirects
 *   the customer to Stripe's hosted payment page. After payment, Stripe
 *   redirects back to /dashboard/orders/:id?stripe_session={CHECKOUT_SESSION_ID}
 *   where we verify + mark the Order APPROVED.
 *
 * GET /api/orders/:id/checkout?session_id=XXX
 *   Verifies a completed Checkout Session and advances the Order to APPROVED
 *   (with OrderApproval record and stripeChargeId). Called after the redirect
 *   back from Stripe.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const BASE = "https://api.stripe.com/v1";

async function stripeFetch(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  if (!STRIPE_KEY) throw new Error("Stripe not configured");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const errObj = data.error as { message?: string } | undefined;
    throw new Error(errObj?.message ?? "Stripe request failed");
  }
  return data;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });
  if (!STRIPE_KEY)
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (session.role === "CUSTOMER" && order.companyId !== session.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (order.status !== "PROOF_READY") {
    return NextResponse.json(
      { error: `order must be PROOF_READY, currently ${order.status}` },
      { status: 409 },
    );
  }

  if (!order.totalPrice || order.totalPrice <= 0) {
    return NextResponse.json(
      { error: "order has no price — cannot create checkout" },
      { status: 400 },
    );
  }

  const portalUrl = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
  const successUrl = `${portalUrl}/dashboard/orders/${id}?stripe_session={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${portalUrl}/dashboard/orders/${id}?stripe_cancelled=1`;

  // Create Checkout Session
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("client_reference_id", order.id);
  body.set("metadata[orderId]", order.id);
  body.set("metadata[orderCode]", order.orderCode);
  body.set("metadata[companyId]", order.companyId);
  body.set(
    "customer_email",
    session.email || `customer-${order.companyId}@invoice.cndprinting.com`,
  );
  // Line item
  body.set("line_items[0][price_data][currency]", "usd");
  body.set(
    "line_items[0][price_data][product_data][name]",
    `${order.orderCode} — ${order.description ?? "Mailing"}`,
  );
  body.set(
    "line_items[0][price_data][product_data][description]",
    `${order.quantity.toLocaleString()} pieces · ${order.company.name}`,
  );
  body.set(
    "line_items[0][price_data][unit_amount]",
    String(Math.round(order.totalPrice * 100)),
  );
  body.set("line_items[0][quantity]", "1");

  const checkout = (await stripeFetch("/checkout/sessions", {
    method: "POST",
    body: body.toString(),
  })) as { id: string; url: string };

  return NextResponse.json({ url: checkout.url, sessionId: checkout.id });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId)
    return NextResponse.json({ error: "session_id required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id },
    include: { approval: true },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (order.approval) {
    return NextResponse.json({ ok: true, alreadyApproved: true });
  }

  // Retrieve Checkout Session from Stripe
  const cs = (await stripeFetch(`/checkout/sessions/${sessionId}`)) as {
    id: string;
    payment_status: string;
    payment_intent: string;
    client_reference_id: string;
    amount_total: number;
    metadata?: { orderId?: string };
  };

  if (cs.metadata?.orderId !== order.id) {
    return NextResponse.json(
      { error: "session does not match this order" },
      { status: 400 },
    );
  }
  if (cs.payment_status !== "paid") {
    return NextResponse.json(
      { error: `payment not completed (status: ${cs.payment_status})` },
      { status: 402 },
    );
  }

  // Record approval + advance order
  const approval = await prisma.orderApproval.create({
    data: {
      orderId: order.id,
      approvedByUserId: session.id,
      approvedByName: session.name,
      stripePaymentIntentId: cs.payment_intent,
      amountCharged: cs.amount_total / 100,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        null,
      userAgent: req.headers.get("user-agent") ?? null,
    },
  });
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "APPROVED",
      paidAt: new Date(),
      stripePaymentIntentId: cs.payment_intent,
    },
  });

  return NextResponse.json({ ok: true, approval });
}
