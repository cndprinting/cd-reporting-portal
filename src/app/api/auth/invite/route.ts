import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/services/email";
import crypto from "crypto";

function renderInviteEmail(params: {
  inviteUrl: string;
  companyName: string | null;
  inviterName: string;
  role: string;
}) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
 <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
   <tr><td style="padding:32px;background:#1e293b;color:#ffffff;">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">C&amp;D Printing Reporting Portal</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;">You&rsquo;ve been invited</div>
   </td></tr>
   <tr><td style="padding:32px;font-size:14px;line-height:1.6;">
    <p style="margin:0 0 14px;"><strong>${params.inviterName}</strong> invited you to the C&amp;D Printing reporting portal${params.companyName ? ` as a ${params.role.toLowerCase().replace(/_/g, " ")} for <strong>${params.companyName}</strong>` : ""}.</p>
    <p style="margin:0 0 20px;">Click below to set up your account and log in. This invite expires in 7 days.</p>
    <p style="margin:24px 0;">
     <a href="${params.inviteUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Accept invite &rarr;</a>
    </p>
    <p style="margin:0;font-size:12px;color:#64748b;">Or paste this link into your browser:<br/><a href="${params.inviteUrl}" style="color:#0ea5e9;word-break:break-all;">${params.inviteUrl}</a></p>
   </td></tr>
   <tr><td style="padding:16px 32px;background:#f8fafc;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;">
    If you weren&rsquo;t expecting this invite, you can safely ignore it.<br/>&copy; C&amp;D Printing
   </td></tr>
  </table>
 </td></tr>
</table>
</body></html>`;
}

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

    // Fire email (best-effort — UI still gets the inviteUrl back so admin can copy/paste if email fails)
    const company = companyId || session.companyId
      ? await prisma.company.findUnique({
          where: { id: (companyId || session.companyId)! },
          select: { name: true },
        })
      : null;

    const emailResult = await sendEmail({
      to: email,
      subject: `You're invited to the C&D Reporting Portal`,
      html: renderInviteEmail({
        inviteUrl,
        companyName: company?.name ?? null,
        inviterName: session.name || "C&D Team",
        role: role || "CUSTOMER",
      }),
    });

    return NextResponse.json({
      inviteUrl,
      token,
      expiresAt,
      emailSent: emailResult.ok,
      emailError: emailResult.error,
    });
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
