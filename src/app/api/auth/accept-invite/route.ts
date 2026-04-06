import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

    if (!token || !name || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const prismaModule = await import("@/lib/prisma");
    const prisma = prismaModule.default;
    if (!prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const invite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!invite) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }
    if (invite.usedAt) {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
    }

    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Create the user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: invite.email,
        name,
        passwordHash,
        role: invite.role,
        companyId: invite.companyId,
      },
      include: { company: true },
    });

    // Mark invite as used
    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    // Create session
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
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
