/**
 * Start a Stripe Checkout session in "setup" mode to save a card on file.
 * POST /api/billing/setup-card
 *
 * Flow:
 *   1. Ensure Company has a Stripe Customer ID (create one if not)
 *   2. Create a Checkout Session with mode=setup → gets a URL
 *   3. Client redirects user to that URL
 *   4. After card entry, Stripe redirects back to /dashboard/billing?setup=XXX
 *   5. /api/billing/verify-setup attaches the card as default payment method
 *      and marks the customer ready for off-session charges
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

async function stripePost(
  path: string,
  body: URLSearchParams,
): Promise<Record<string, unknown>> {
  if (!STRIPE_KEY) throw new Error("Stripe not configured");
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const errObj = data.error as { message?: string } | undefined;
    throw new Error(errObj?.message ?? "Stripe error");
  }
  return data;
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });
  if (!STRIPE_KEY)
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  if (!session.companyId)
    return NextResponse.json({ error: "no company on session" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: session.companyId } });
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  // 1. Ensure Stripe Customer exists
  let customerId = company.stripeCustomerId;
  if (!customerId) {
    const params = new URLSearchParams();
    params.set("name", company.name);
    params.set("email", session.email ?? "");
    params.set("metadata[companyId]", company.id);
    params.set("metadata[source]", "cd-reporting-portal");
    const customer = (await stripePost("/customers", params)) as { id: string };
    customerId = customer.id;
    await prisma.company.update({
      where: { id: company.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // 2. Create Setup Checkout Session
  const portalUrl = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
  const body = new URLSearchParams();
  body.set("mode", "setup");
  body.set("customer", customerId);
  body.set("success_url", `${portalUrl}/dashboard/billing?setup={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${portalUrl}/dashboard/billing?setup_cancelled=1`);
  body.set("payment_method_types[0]", "card");

  const cs = (await stripePost("/checkout/sessions", body)) as { url: string };

  return NextResponse.json({ url: cs.url });
}
