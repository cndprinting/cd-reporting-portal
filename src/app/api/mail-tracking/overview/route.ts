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
  // Operational view excludes EXPIRED_NO_SCAN by default (these never produce
  // scans — drops > 30d ago, past USPS retention). Pass ?includeExpired=true
  // for full historical audit view.
  const includeExpired = url.searchParams.get("includeExpired") === "true";

  // Customers can only see their own company
  let companyId: string | null = null;
  if (session.role === "CUSTOMER") {
    companyId = session.companyId;
  } else if (reqCompanyId) {
    companyId = reqCompanyId;
  }
  // Admin with no filter → companyId stays null = all customers aggregate

  const baseWhere: Record<string, unknown> = {};
  if (companyId) baseWhere.companyId = companyId;
  if (!includeExpired) baseWhere.status = { not: "EXPIRED_NO_SCAN" };
  const where = baseWhere;

  const [
    pieces,
    totalPieceCount,
    scanCount,
    deliveryDaily,
    statusGroups,
    recentPieces,
    operationGroups,
  ] = await Promise.all([
      prisma.mailPiece.findMany({
        where,
        select: { id: true, status: true, daysToDeliver: true },
        take: 100000,
      }),
      prisma.mailPiece.count({ where }),
      prisma.scanEvent.count({
        where: {
          mailPiece: {
            ...(companyId ? { companyId } : {}),
            ...(includeExpired ? {} : { status: { not: "EXPIRED_NO_SCAN" } }),
          },
        },
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
      prisma.scanEvent.groupBy({
        by: ["operation"],
        where: companyId ? { mailPiece: { companyId } } : {},
        _count: true,
      }),
    ]);

  // Per-customer rollup (only for "All customers" admin view)
  const perCustomer: Array<{
    id: string;
    name: string;
    pieceCount: number;
    scanCount: number;
    acceptedCount: number;
    deliveredCount: number;
    lastScanAt: string | null;
  }> = [];
  if (!companyId && session.role !== "CUSTOMER") {
    // Only include customers with at least one ACTIVE piece (non-expired).
    // Customers whose entire history is EXPIRED_NO_SCAN (drops > 30d ago,
    // past USPS scan window) belong in the historical view, not the live
    // operational rollup — they'll never produce new scans.
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        pieceCount: bigint;
        scanCount: bigint;
        acceptedCount: bigint;
        deliveredCount: bigint;
        lastScanAt: Date | null;
      }>
    >`
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT mp.id) FILTER (WHERE mp.status != 'EXPIRED_NO_SCAN')::bigint AS "pieceCount",
        COUNT(se.id)::bigint AS "scanCount",
        COUNT(DISTINCT mp.id) FILTER (WHERE mp."firstScanAt" IS NOT NULL)::bigint AS "acceptedCount",
        COUNT(DISTINCT mp.id) FILTER (WHERE mp.status IN ('DELIVERED','DELIVERED_INFERRED'))::bigint AS "deliveredCount",
        MAX(se."scanDatetime") AS "lastScanAt"
      FROM "Company" c
      LEFT JOIN "MailPiece" mp ON mp."companyId" = c.id
      LEFT JOIN "ScanEvent" se ON se."mailPieceId" = mp.id
      WHERE c."isActive" = true
      GROUP BY c.id, c.name
      HAVING COUNT(DISTINCT mp.id) FILTER (WHERE mp.status != 'EXPIRED_NO_SCAN') > 0
      ORDER BY "scanCount" DESC, c.name ASC
    `;
    for (const r of rows) {
      perCustomer.push({
        id: r.id,
        name: r.name,
        pieceCount: Number(r.pieceCount),
        scanCount: Number(r.scanCount),
        acceptedCount: Number(r.acceptedCount),
        deliveredCount: Number(r.deliveredCount),
        lastScanAt: r.lastScanAt ? r.lastScanAt.toISOString() : null,
      });
    }
  }

  // Recent scan feed — last 50 scans, with company + facility info
  const recentScans = await prisma.scanEvent.findMany({
    where: companyId ? { mailPiece: { companyId } } : {},
    orderBy: { scanDatetime: "desc" },
    take: 50,
    select: {
      id: true,
      scanDatetime: true,
      operation: true,
      operationDesc: true,
      facilityCity: true,
      facilityState: true,
      mailPiece: {
        select: {
          imb: true,
          recipientName: true,
          city: true,
          state: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  });

  const statusCounts: Record<string, number> = {};
  for (const g of statusGroups) statusCounts[g.status] = g._count;

  const delivered = (statusCounts.DELIVERED ?? 0) + (statusCounts.DELIVERED_INFERRED ?? 0);
  const ttdValues = pieces.map((p) => p.daysToDeliver).filter((v): v is number => v != null);
  const avgDaysToDeliver = ttdValues.length
    ? ttdValues.reduce((s, v) => s + v, 0) / ttdValues.length
    : 0;

  // Count archived (expired) pieces separately so the UI can show them as
  // context without polluting the main "Total Pieces" KPI.
  const archivedCount = await prisma.mailPiece.count({
    where: {
      ...(companyId ? { companyId } : {}),
      status: "EXPIRED_NO_SCAN",
    },
  });

  return NextResponse.json({
    companyId,
    campaignId: "",
    totalQuantity: totalPieceCount,
    pieceCount: totalPieceCount,
    archivedCount,
    scanCount,
    statusCounts,
    deliveryRate: totalPieceCount ? delivered / totalPieceCount : 0,
    avgDaysToDeliver,
    deliveryCurve: deliveryDaily.map((d) => ({
      date: d.day,
      delivered: Number(d.delivered),
    })),
    operationBreakdown: operationGroups.map((g) => ({
      operation: g.operation,
      count: g._count,
    })),
    perCustomer,
    recentScans: recentScans.map((s) => ({
      id: s.id,
      scanDatetime: s.scanDatetime.toISOString(),
      operation: s.operation,
      operationDesc: s.operationDesc,
      facilityCity: s.facilityCity,
      facilityState: s.facilityState,
      imb: s.mailPiece?.imb,
      recipientName: s.mailPiece?.recipientName,
      destinationCity: s.mailPiece?.city,
      destinationState: s.mailPiece?.state,
      companyId: s.mailPiece?.company?.id,
      companyName: s.mailPiece?.company?.name,
    })),
    pieces: recentPieces,
    batches: [],
  });
}
