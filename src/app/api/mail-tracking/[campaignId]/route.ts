/**
 * Mail tracking data for a campaign.
 * GET /api/mail-tracking/:campaignId
 *   Returns: KPIs, delivery curve, per-status counts, piece-level rows (first 500).
 *
 * Falls back to demo data if DB unavailable (so UI can be built/demo'd before
 * IV-MTR credentials are provisioned).
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDemoMailTracking } from "@/lib/demo-data";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;

  if (!prisma) {
    return NextResponse.json(getDemoMailTracking(campaignId));
  }

  const [pieces, batches] = await Promise.all([
    prisma.mailPiece.findMany({
      where: { campaignId },
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
      },
      take: 500,
      orderBy: [{ deliveredAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.mailBatch.findMany({ where: { campaignId } }),
  ]);

  // Delivery curve: count scans per day per operation type
  const curveRows = await prisma.scanEvent.groupBy({
    by: ["operation"],
    where: { mailPiece: { campaignId } },
    _count: true,
  });

  // Daily delivered counts for trend chart
  const daily = await prisma.$queryRaw<Array<{ day: Date; delivered: bigint }>>`
    SELECT DATE_TRUNC('day', "deliveredAt") AS day, COUNT(*) AS delivered
    FROM "MailPiece"
    WHERE "campaignId" = ${campaignId} AND "deliveredAt" IS NOT NULL
    GROUP BY 1 ORDER BY 1
  `;

  const statusCounts = pieces.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
  const delivered = (statusCounts.DELIVERED ?? 0) + (statusCounts.DELIVERED_INFERRED ?? 0);

  return NextResponse.json({
    campaignId,
    totalQuantity,
    pieceCount: pieces.length,
    statusCounts,
    deliveryRate: totalQuantity ? delivered / totalQuantity : 0,
    avgDaysToDeliver:
      pieces.filter((p) => p.daysToDeliver != null).reduce((s, p) => s + (p.daysToDeliver ?? 0), 0) /
      Math.max(1, pieces.filter((p) => p.daysToDeliver != null).length),
    deliveryCurve: daily.map((d) => ({ date: d.day, delivered: Number(d.delivered) })),
    operationBreakdown: curveRows.map((r) => ({ operation: r.operation, count: r._count })),
    pieces,
    batches,
  });
}
