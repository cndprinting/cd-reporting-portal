/**
 * Single MailPackage: detail + drawdown history.
 * GET /api/packages/:id
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
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const pkg = await prisma.mailPackage.findUnique({
    where: { id },
    include: {
      company: true,
      drawdowns: {
        include: { order: { select: { orderCode: true, description: true, quantity: true } } },
        orderBy: { drawnAt: "desc" },
      },
      orders: { select: { id: true, orderCode: true, quantity: true, status: true } },
    },
  });
  if (!pkg) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (session.role === "CUSTOMER" && pkg.companyId !== session.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(pkg);
}
