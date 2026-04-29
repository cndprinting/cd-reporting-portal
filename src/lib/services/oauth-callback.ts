/**
 * Shared OAuth callback handler used by both /api/auth/google/callback and
 * /api/auth/microsoft/callback.
 *
 * Behavior:
 *   1. Validate state (CSRF defense)
 *   2. Exchange code for token, fetch userinfo
 *   3. Look up User by email
 *      - if found → log them in (with optional invite-token consumption if any)
 *      - if not found but a pending InviteToken exists for the email →
 *        consume the invite, create the User with the role from the invite,
 *        log them in
 *      - else → redirect to /login with a friendly "no account, contact admin"
 *   4. Set our normal session cookie via createSession()
 *   5. Redirect to original `next` (default /dashboard)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  consumeState,
  exchangeCodeAndFetchUser,
  type OAuthProviderConfig,
} from "./oauth";
import { createSession } from "@/lib/session";

export async function handleOAuthCallback(
  req: NextRequest,
  cfg: OAuthProviderConfig,
): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    // Microsoft sends extra detail in error_description — surface it so we
    // can diagnose without digging through Vercel logs
    const errorDesc = url.searchParams.get("error_description");
    const fullMsg = errorDesc
      ? `${cfg.provider}: ${errorParam} — ${errorDesc.slice(0, 250)}`
      : `${cfg.provider}: ${errorParam}`;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(fullMsg)}`, req.url),
    );
  }
  if (!code || !stateParam) {
    return NextResponse.redirect(new URL(`/login?error=missing-code`, req.url));
  }

  const stateCheck = await consumeState(stateParam, cfg.provider);
  if (!stateCheck.ok) {
    return NextResponse.redirect(new URL(`/login?error=invalid-state`, req.url));
  }

  let providerUser;
  try {
    providerUser = await exchangeCodeAndFetchUser(cfg, code);
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent((e as Error).message.slice(0, 120))}`,
        req.url,
      ),
    );
  }

  if (!providerUser.emailVerified) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(`${cfg.provider} email not verified`)}`, req.url),
    );
  }

  if (!prisma) {
    return NextResponse.redirect(new URL(`/login?error=db-unavailable`, req.url));
  }

  // Find existing user
  let user = await prisma.user.findUnique({
    where: { email: providerUser.email },
    include: { company: { select: { id: true, name: true, isActive: true } } },
  });

  // No existing user? Try a pending invite.
  if (!user) {
    const invite = await prisma.inviteToken.findFirst({
      where: {
        email: providerUser.email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invite) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("No account for that email. Contact your C&D rep for an invite.")}`,
          req.url,
        ),
      );
    }

    // Consume invite: create User, mark invite used
    user = await prisma.user.create({
      data: {
        email: providerUser.email,
        name: providerUser.name,
        // No password — they sign in via SSO. passwordHash gets a random
        // unguessable string so credential login is effectively disabled
        // for them until they set one.
        passwordHash: `sso-${cfg.provider}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: invite.role,
        companyId: invite.companyId,
      },
      include: { company: { select: { id: true, name: true, isActive: true } } },
    });
    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
  }

  // Refuse if their company is archived
  if (user.company && user.company.isActive === false) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Your account is currently inactive. Contact your C&D rep.")}`,
        req.url,
      ),
    );
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    companyName: user.company?.name ?? null,
  });

  return NextResponse.redirect(new URL(stateCheck.next || "/dashboard", req.url));
}
