import { NextRequest, NextResponse } from "next/server";
import { createSession, destroySession } from "@/lib/session";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { verifyTurnstile } from "@/lib/services/captcha";
import {
  emailDomainHasMx,
  newVerifyToken,
  sendVerificationEmail,
} from "@/lib/services/email-verify";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name, companyName, turnstileToken } = body;

    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
      }

      // Try database auth
      const prismaModule = await import("@/lib/prisma");
      const prisma = prismaModule.default;

      if (prisma) {
        const user = await prisma.user.findUnique({
          where: { email },
          include: { company: true },
        });

        if (!user) {
          return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // Gate login on email verification — but allow legacy users (no
        // verify token ever issued AND no verified timestamp) for pre-flow
        // accounts. New signups always get a token, so the first condition
        // captures only "verified or grandfathered."
        const grandfathered = !user.emailVerifyToken && !user.emailVerifiedAt;
        if (!user.emailVerifiedAt && !grandfathered) {
          return NextResponse.json(
            { error: "Please verify your email before signing in.", needsVerification: true, email: user.email },
            { status: 403 },
          );
        }

        const sessionUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "ADMIN" | "ACCOUNT_MANAGER" | "CUSTOMER",
          companyId: user.companyId,
          companyName: user.company?.name || null,
        };

        await createSession(sessionUser);
        return NextResponse.json({ user: sessionUser });
      }

      // Demo mode fallback
      const { demoUser } = await import("@/lib/demo-data");
      await createSession({ ...demoUser, email });
      return NextResponse.json({ user: { ...demoUser, email } });
    }

    if (action === "signup") {
      if (!email || !password || !name) {
        return NextResponse.json({ error: "All fields are required" }, { status: 400 });
      }

      // 1) CAPTCHA — only enforced if TURNSTILE_SECRET is set.
      const captcha = await verifyTurnstile(turnstileToken);
      if (!captcha.ok) {
        return NextResponse.json({ error: captcha.reason ?? "captcha failed" }, { status: 400 });
      }

      // 2) Real-domain check — must have an MX record. Blocks fake@asdf.xyz
      //    while still allowing Gmail / Yahoo / company emails.
      const hasMx = await emailDomainHasMx(email);
      if (!hasMx) {
        return NextResponse.json(
          { error: "That email domain doesn't accept mail. Use an email you can actually receive." },
          { status: 400 },
        );
      }

      const prismaModule = await import("@/lib/prisma");
      const prisma = prismaModule.default;

      if (prisma) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return NextResponse.json({ error: "Email already in use" }, { status: 409 });
        }

        let companyId: string | undefined;
        if (companyName) {
          const company = await prisma.company.create({
            data: {
              name: companyName,
              slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
            },
          });
          companyId = company.id;
        }

        const passwordHash = await hashPassword(password);
        const { token, expiresAt } = newVerifyToken();
        const user = await prisma.user.create({
          data: {
            email,
            name,
            passwordHash,
            companyId,
            emailVerifyToken: token,
            emailVerifyTokenExpiresAt: expiresAt,
          },
          include: { company: true },
        });

        // 3) Send the verification email. Fire-and-await so we surface
        //    transport failures to the UI (instead of "silent success").
        const sent = await sendVerificationEmail({ to: user.email, name: user.name, token });
        if (!sent.ok) {
          console.error("[auth/signup] verification email failed:", sent.error);
        }

        // No session yet — user must click the link first.
        return NextResponse.json({
          requiresVerification: true,
          email: user.email,
          sent: sent.ok,
        });
      }

      // Demo mode (no DB) — keep the old behavior.
      const { demoUser } = await import("@/lib/demo-data");
      await createSession({ ...demoUser, email, name });
      return NextResponse.json({ user: { ...demoUser, email, name } });
    }

    if (action === "logout") {
      await destroySession();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
