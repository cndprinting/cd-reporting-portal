/**
 * Mail tracking overview — aggregate KPIs + recent piece list across all
 * campaigns for one company (or all companies if admin & no companyId filter).
 *
 * GET /api/mail-tracking/overview          → admin: all customers; customer: own
 * GET /api/mail-tracking/overview?companyId=X  → scope to that company
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const url = new URL(req.url);
  const reqCompanyId = url.searchParams.get("companyId");

  // Customers can only see their own company
  let companyId: string | null = null;
  if (session.role === "CUSTOMER") {
    companyId = session.companyId;
  } else if (reqCompanyId) {
    companyId = reqCompanyId;
  }
  // Admin with no filter → companyId stays null = all customers aggregate

  const where = companyId ? { companyId } : {};

  const [pieces, totalPieceCount, scanCount, deliveryDaily, statusGroups, recentPieces] =
    await Promise.all([
      prisma.mailPiece.findMany({
        where,
        select: { id: true, status: true, daysToDeliver: true },
        take: 100000,
      }),
      prisma.mailPiece.count({ where }),
      prisma.scanEvent.count({
        where: companyId ? { mailPiece: { companyId } } : {},
      }),
      companyId
        ? prisma.$queryRaw<Array<{ day: Date; delivered: bigint }>>`
            SELECT DATE_TRUNC('day', "deliveredAt") AS day, COUNT(*)::bigint AS delivered
              FROM "MailPiece"
             WHERE "companyId" = ${companyId} AND "deliveredAt" IS NOT NULL
            GROUP BY 1 ORDER BY 1`
        : prisma.$queryRaw<Array<{ day: Date; delivered: bigint }>>`
            SELECT DATE_TRUNC('day', "deliveredAt") AS day, COUNT(*)::bigint AS delivered
              FROM "MailPiece"
             WHERE "deliveredAt" IS NOT NULL
            GROUP BY 1 ORDER BY 1`,
      prisma.mailPiece.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.mailPiece.findMany({
        where: { ...where, firstScanAt: { not: null } },
        select: {
          id: true,
          imb: true,
          recipientName: true,
          city: true,
          state: true,
          zip5: true,
          status: true,
          expectedInHomeDate: true,
          firstScanAt: true,
          deliveredAt: true,
          daysToDeliver: true,
          isSeed: true,
          company: { select: { id: true, name: true } },
        },
        take: 500,
        orderBy: [{ deliveredAt: "desc" }, { lastScanAt: "desc" }],
      }),
    ]);

  const statusCounts: Record<string, number> = {};
  for (const g of statusGroups) statusCounts[g.status] = g._count;

  const delivered = (statusCounts.DELIVERED ?? 0) + (statusCounts.DELIVERED_INFERRED ?? 0);
  const ttdValues = pieces.map((p) => p.daysToDeliver).filter((v): v is number => v != null);
  const avgDaysToDeliver = ttdValues.length
    ? ttdValues.reduce((s, v) => s + v, 0) / ttdValues.length
    : 0;

  return NextResponse.json({
    companyId,
    totalQuantity: totalPieceCount,
    pieceCount: totalPieceCount,
    scanCount,
    statusCounts,
    deliveryRate: totalPieceCount ? delivered / totalPieceCount : 0,
    avgDaysToDeliver,
    deliveryCurve: deliveryDaily.map((d) => ({
      date: d.day,
      delivered: Number(d.delivered),
    })),
    pieces: recentPieces,
  });
}
