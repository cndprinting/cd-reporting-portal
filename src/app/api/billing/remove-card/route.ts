/**
 * Remove the default payment method from the company's Stripe Customer.
 * POST /api/billing/remove-card
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });
  if (!STRIPE_KEY)
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  if (!session.companyId)
    return NextResponse.json({ error: "no company on session" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: session.companyId } });
  if (!company?.stripeCustomerId)
    return NextResponse.json({ error: "no Stripe customer" }, { status: 404 });

  // Get current default PM
  const customerResp = await fetch(
    `https://api.stripe.com/v1/customers/${company.stripeCustomerId}`,
    { headers: { Authorization: `Bearer ${STRIPE_KEY}` } },
  );
  const customer = (await customerResp.json()) as {
    invoice_settings?: { default_payment_method?: string };
  };
  const pmId = customer.invoice_settings?.default_payment_method;
  if (!pmId) return NextResponse.json({ ok: true, message: "no card to remove" });

  // Detach PM
  await fetch(`https://api.stripe.com/v1/payment_methods/${pmId}/detach`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });

  // Clear default
  const clearBody = new URLSearchParams();
  clearBody.set("invoice_settings[default_payment_method]", "");
  await fetch(`https://api.stripe.com/v1/customers/${company.stripeCustomerId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: clearBody.toString(),
  });

  return NextResponse.json({ ok: true });
}
