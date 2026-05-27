/**
 * Per-customer mail-tracking rollup.
 * GET /api/mailers/:companyId/tracking
 *
 * Auth: accepts EITHER
 *   - logged-in session (admin/account manager, or user on that company)
 *   - Authorization: Bearer cdk_live_... API key scoped to that company
 *
 * Query params:
 *   mid?        filter by Mailer ID
 *   campaignId? filter to one campaign
 *   batchId?    filter to one batch
 *   from,to?    date range on drop date (YYYY-MM-DD)
 *
 * Response: aggregate KPIs + per-campaign rollup + per-MID rollup + status breakdown.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { verifyApiKey, requireScope } from "@/lib/services/api-keys";
import { zipToState } from "@/lib/zip-geo";

export const runtime = "nodejs";

async function authorize(
  req: NextRequest,
  companyId: string,
): Promise<{ ok: boolean; reason?: string }> {
  // 1. API key?
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const verified = await verifyApiKey(authHeader);
    if (!verified.ok) return { ok: false, reason: verified.reason };
    if (verified.companyId !== companyId) return { ok: false, reason: "key scoped to different company" };
    if (!requireScope(verified.scopes, "read:tracking")) return { ok: false, reason: "missing scope" };
    return { ok: true };
  }
  // 2. Session?
  const session = await getSession();
  if (!session) return { ok: false, reason: "not authenticated" };
  if (session.role === "ADMIN" || session.role === "ACCOUNT_MANAGER") return { ok: true };
  if (session.companyId === companyId) return { ok: true };
  return { ok: false, reason: "forbidden" };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const auth = await authorize(req, companyId);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const url = new URL(req.url);
  const mid = url.searchParams.get("mid") ?? undefined;
  const campaignId = url.searchParams.get("campaignId") ?? undefined;
  const batchId = url.searchParams.get("batchId") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const includeExpired = url.searchParams.get("includeExpired") === "true";

  const pieceWhere: Record<string, unknown> = { companyId };
  if (mid) pieceWhere.imbMailerId = mid;
  if (campaignId) pieceWhere.campaignId = campaignId;
  if (batchId) pieceWhere.mailBatchId = batchId;
  // Operational view excludes EXPIRED_NO_SCAN (drops > 30d, past USPS window)
  if (!includeExpired) pieceWhere.status = { not: "EXPIRED_NO_SCAN" };

  const batchWhere: Record<string, unknown> = { campaign: { companyId } };
  if (mid) batchWhere.mailerId = mid;
  if (campaignId) batchWhere.campaignId = campaignId;
  if (batchId) batchWhere.id = batchId;
  if (from || to) {
    batchWhere.dropDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [pieces, batches, byCampaign, byMid, byStatus] = await Promise.all([
    prisma.mailPiece.count({ where: pieceWhere }),
    prisma.mailBatch.findMany({
      where: batchWhere,
      include: { campaign: { select: { id: true, name: true, campaignCode: true } } },
    }),
    prisma.mailPiece.groupBy({
      by: ["campaignId", "status"],
      where: pieceWhere,
      _count: true,
    }),
    prisma.mailPiece.groupBy({
      by: ["imbMailerId"],
      where: pieceWhere,
      _count: true,
    }),
    prisma.mailPiece.groupBy({
      by: ["status"],
      where: pieceWhere,
      _count: true,
    }),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const delivered =
    (statusCounts.DELIVERED ?? 0) + (statusCounts.DELIVERED_INFERRED ?? 0);

  // Per-state delivery rollup for the heat map. Recipient addresses aren't stored
  // on every piece, but the IMb routing code embeds the destination ZIP, so we
  // derive the delivery state from the barcode. Aggregate in JS to keep the
  // dynamic filters (mid/campaign/batch/expired) consistent with pieceWhere.
  const geoPieces = await prisma.mailPiece.findMany({
    where: pieceWhere,
    select: { imbRoutingZip: true, status: true },
  });
  const stateMap = new Map<string, { total: number; delivered: number }>();
  for (const p of geoPieces) {
    const st = zipToState(p.imbRoutingZip);
    if (!st) continue;
    const entry = stateMap.get(st) ?? { total: 0, delivered: 0 };
    entry.total += 1;
    if (p.status === "DELIVERED" || p.status === "DELIVERED_INFERRED") entry.delivered += 1;
    stateMap.set(st, entry);
  }
  const perState = [...stateMap.entries()]
    .map(([state, v]) => ({ state, ...v }))
    .sort((a, b) => b.total - a.total);

  // Resolve campaign names so the customer view doesn't show raw cuid strings
  const campaignIds = [...new Set(byCampaign.map((r) => r.campaignId))];
  const campaignRows = campaignIds.length
    ? await prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, name: true, campaignCode: true },
      })
    : [];
  const nameById = new Map(campaignRows.map((c) => [c.id, c]));

  // Roll up per-campaign summary
  const campaignMap = new Map<
    string,
    { campaignId: string; name: string; campaignCode: string; total: number; delivered: number }
  >();
  for (const row of byCampaign) {
    const meta = nameById.get(row.campaignId);
    const entry = campaignMap.get(row.campaignId) ?? {
      campaignId: row.campaignId,
      name: meta?.name ?? row.campaignId,
      campaignCode: meta?.campaignCode ?? "",
      total: 0,
      delivered: 0,
    };
    entry.total += row._count;
    if (row.status === "DELIVERED" || row.status === "DELIVERED_INFERRED") {
      entry.delivered += row._count;
    }
    campaignMap.set(row.campaignId, entry);
  }

  return NextResponse.json({
    companyId,
    filters: { mid, campaignId, batchId, from, to },
    totals: {
      pieces,
      delivered,
      deliveryRate: pieces ? delivered / pieces : 0,
    },
    statusCounts,
    perState,
    perCampaign: [...campaignMap.values()],
    perMailerId: byMid.map((m) => ({ mid: m.imbMailerId, count: m._count })),
    batches,
  });
}
