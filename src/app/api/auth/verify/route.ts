/**
 * Email verification landing endpoint.
 * GET /api/auth/verify?token=<uuid>
 *
 * Looks up the user by token, stamps emailVerifiedAt, clears the token,
 * starts a session, and redirects to the dashboard.
 *
 * Failure paths redirect to /verify with ?error=... so the React page can
 * show a friendly message + resend option.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

function redirect(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url));
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return redirect(req, "/verify?error=missing-token");
  if (!prisma) return redirect(req, "/verify?error=db-unavailable");

  const user = await prisma.user.findUnique({
    where: { emailVerifyToken: token },
    include: { company: true },
  });
  if (!user) return redirect(req, "/verify?error=invalid-token");
  if (user.emailVerifyTokenExpiresAt && user.emailVerifyTokenExpiresAt < new Date()) {
    return redirect(req, `/verify?error=expired&email=${encodeURIComponent(user.email)}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyTokenExpiresAt: null,
    },
  });

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "ADMIN" | "ACCOUNT_MANAGER" | "CUSTOMER",
    companyId: user.companyId,
    companyName: user.company?.name || null,
  });

  // Land on a small success page that auto-redirects so they see the confirmation.
  return redirect(req, "/verify?ok=1");
}
