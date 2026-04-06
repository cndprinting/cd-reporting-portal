import { NextRequest, NextResponse } from "next/server";
import { createSession, destroySession } from "@/lib/session";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name, companyName } = body;

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
        const user = await prisma.user.create({
          data: { email, name, passwordHash, companyId },
          include: { company: true },
        });

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

      // Demo mode
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
