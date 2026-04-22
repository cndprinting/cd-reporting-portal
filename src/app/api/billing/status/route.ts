/**
 * Billing status for the current user's company.
 * GET /api/billing/status
 *
 * Returns:
 *   - hasStripeCustomer: boolean (true if Company.stripeCustomerId set)
 *   - hasPaymentMethod: boolean (true if customer has a default PM attached)
 *   - paymentMethod: { last4, brand, expMonth, expYear } | null
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });
  if (!session.companyId)
    return NextResponse.json({ error: "no company on session" }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  const status: {
    companyName: string;
    hasStripeCustomer: boolean;
    hasPaymentMethod: boolean;
    paymentMethod: {
      last4: string;
      brand: string;
      expMonth: number;
      expYear: number;
    } | null;
  } = {
    companyName: company.name,
    hasStripeCustomer: !!company.stripeCustomerId,
    hasPaymentMethod: false,
    paymentMethod: null,
  };

  if (!STRIPE_KEY || !company.stripeCustomerId) return NextResponse.json(status);

  // Look up default payment method on the Stripe Customer
  const customerResp = await fetch(
    `https://api.stripe.com/v1/customers/${company.stripeCustomerId}`,
    { headers: { Authorization: `Bearer ${STRIPE_KEY}` } },
  );
  if (!customerResp.ok) return NextResponse.json(status);
  const customer = (await customerResp.json()) as {
    invoice_settings?: { default_payment_method?: string };
  };
  const pmId = customer.invoice_settings?.default_payment_method;
  if (!pmId) return NextResponse.json(status);

  const pmResp = await fetch(`https://api.stripe.com/v1/payment_methods/${pmId}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  if (pmResp.ok) {
    const pm = (await pmResp.json()) as {
      card?: { last4: string; brand: string; exp_month: number; exp_year: number };
    };
    if (pm.card) {
      status.hasPaymentMethod = true;
      status.paymentMethod = {
        last4: pm.card.last4,
        brand: pm.card.brand,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      };
    }
  }

  return NextResponse.json(status);
}
