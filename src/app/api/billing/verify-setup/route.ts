/**
 * After customer completes the Stripe Checkout setup flow, attach the card
 * as the default payment method on the Stripe Customer.
 *
 * GET /api/billing/verify-setup?session_id=XXX
 *
 * Returns success/failure + card details.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

async function stripeFetch(
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  if (!STRIPE_KEY) throw new Error("Stripe not configured");
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
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
    throw new Error(errObj?.message ?? "Stripe error");
  }
  return data;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });
  if (!STRIPE_KEY)
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId)
    return NextResponse.json({ error: "session_id required" }, { status: 400 });

  // Retrieve the checkout session
  const cs = (await stripeFetch(`/checkout/sessions/${sessionId}`)) as {
    customer: string;
    setup_intent: string;
    mode: string;
  };
  if (cs.mode !== "setup") {
    return NextResponse.json({ error: "not a setup session" }, { status: 400 });
  }

  // Retrieve the SetupIntent to get the saved payment method
  const si = (await stripeFetch(`/setup_intents/${cs.setup_intent}`)) as {
    payment_method: string;
    status: string;
  };
  if (si.status !== "succeeded") {
    return NextResponse.json(
      { error: `setup intent status: ${si.status}` },
      { status: 400 },
    );
  }

  // Attach the payment method as the customer's default for off-session charges
  const updateBody = new URLSearchParams();
  updateBody.set(
    "invoice_settings[default_payment_method]",
    si.payment_method,
  );
  await stripeFetch(`/customers/${cs.customer}`, {
    method: "POST",
    body: updateBody.toString(),
  });

  return NextResponse.json({ ok: true, customerId: cs.customer });
}
