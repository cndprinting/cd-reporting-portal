/**
 * Resend the verification email for an existing unverified user.
 * POST /api/auth/resend-verification  body: { email, turnstileToken? }
 *
 * Always returns 200 with { ok: true } when the email exists OR doesn't —
 * we don't want to leak which addresses are registered. CAPTCHA-gated so
 * this can't be used as an email-spam relay.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyTurnstile } from "@/lib/services/captcha";
import { newVerifyToken, sendVerificationEmail } from "@/lib/services/email-verify";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, turnstileToken } = body as { email?: string; turnstileToken?: string };
  if (!email) return NextResponse.json({ ok: true });

  const captcha = await verifyTurnstile(turnstileToken);
  if (!captcha.ok) {
    return NextResponse.json({ error: captcha.reason ?? "captcha failed" }, { status: 400 });
  }

  if (!prisma) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email } });
  // Silently succeed for non-existent users to avoid email enumeration.
  if (!user || user.emailVerifiedAt) return NextResponse.json({ ok: true });

  const { token, expiresAt } = newVerifyToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token, emailVerifyTokenExpiresAt: expiresAt },
  });
  await sendVerificationEmail({ to: user.email, name: user.name, token });

  return NextResponse.json({ ok: true });
}
