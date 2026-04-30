/**
 * Per-company CRUD.
 * GET    /api/companies/:id  — admin only. Returns company + nested counts.
 * PATCH  /api/companies/:id  — admin only. Whitelist of editable fields.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      campaigns: {
        select: {
          id: true,
          name: true,
          campaignCode: true,
          createdAt: true,
          _count: { select: { mailPieces: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      orders: {
        select: {
          id: true,
          orderCode: true,
          description: true,
          quantity: true,
          status: true,
          totalPrice: true,
          dropDate: true,
          createdAt: true,
          isCustomQuote: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Aggregate piece + scan stats — useful for the drill-down KPI strip
  const [pieceCount, scanCount, deliveredCount] = await Promise.all([
    prisma.mailPiece.count({ where: { companyId: id } }),
    prisma.scanEvent.count({ where: { mailPiece: { companyId: id } } }),
    prisma.mailPiece.count({
      where: {
        companyId: id,
        status: { in: ["DELIVERED", "DELIVERED_INFERRED"] },
      },
    }),
  ]);

  return NextResponse.json({
    ...company,
    stats: { pieceCount, scanCount, deliveredCount },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  // Whitelist editable fields
  const allowed = [
    "name",
    "industry",
    "website",
    "address",
    "phone",
    "logoUrl",
    "brandPrimary",
    "brandAccent",
    "brandTagline",
    "externalCustomerId",
    "isActive",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no editable fields in body" }, { status: 400 });
  }

  const updated = await prisma.company.update({ where: { id }, data });
  return NextResponse.json(updated);
}
