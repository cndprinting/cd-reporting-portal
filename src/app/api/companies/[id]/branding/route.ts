/**
 * Update white-label branding for a company.
 * PATCH /api/companies/:id/branding
 * Body: { logoUrl?, brandPrimary?, brandAccent?, brandTagline? }
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.company.update({
    where: { id },
    data: {
      logoUrl: body.logoUrl || null,
      brandPrimary: body.brandPrimary || null,
      brandAccent: body.brandAccent || null,
      brandTagline: body.brandTagline || null,
    },
    select: {
      id: true,
      logoUrl: true,
      brandPrimary: true,
      brandAccent: true,
      brandTagline: true,
    },
  });
  return NextResponse.json(updated);
}
