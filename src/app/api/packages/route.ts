/**
 * MailPackage list + create.
 *
 * GET  /api/packages         — admin: all, customer: own company
 * POST /api/packages         — admin creates (Stripe charge happens separately)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ packages: [] });

  const url = new URL(req.url);
  const companyFilter = url.searchParams.get("companyId") || undefined;

  const where: Record<string, unknown> = {};
  if (session.role === "CUSTOMER") {
    where.companyId = session.companyId;
  } else if (companyFilter) {
    where.companyId = companyFilter;
  }

  const packages = await prisma.mailPackage.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { drawdowns: true, orders: true } },
    },
    orderBy: { purchasedAt: "desc" },
  });

  return NextResponse.json({ packages });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const body = await req.json();
  const { companyId, name, totalPieces, price, expiresAt } = body;

  if (!companyId || !totalPieces || !price) {
    return NextResponse.json(
      { error: "companyId, totalPieces, price required" },
      { status: 400 },
    );
  }

  const pkg = await prisma.mailPackage.create({
    data: {
      companyId,
      name: name ?? `${totalPieces.toLocaleString()}-piece package`,
      totalPieces,
      price,
      pricePerPiece: price / totalPieces,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(pkg, { status: 201 });
}
