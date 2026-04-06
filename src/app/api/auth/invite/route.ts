import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { email, role, companyId } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const prismaModule = await import("@/lib/prisma");
    const prisma = prismaModule.default;
    if (!prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.inviteToken.create({
      data: {
        email,
        token,
        role: role || "CUSTOMER",
        companyId: companyId || session.companyId,
        expiresAt,
        createdBy: session.id,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return NextResponse.json({ inviteUrl, token, expiresAt });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
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

    let companyName = null;
    if (invite.companyId) {
      const company = await prisma.company.findUnique({ where: { id: invite.companyId } });
      companyName = company?.name || null;
    }

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      companyName,
    });
  } catch (error) {
    console.error("Invite validation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
