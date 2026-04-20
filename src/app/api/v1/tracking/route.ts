/**
 * Public versioned pull API for customers.
 * GET /api/v1/tracking
 * Authorization: Bearer cdk_live_...
 *
 * Returns tracking data for the company that owns the API key.
 * Same query params as /api/mailers/:companyId/tracking.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, requireScope } from "@/lib/services/api-keys";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const verified = await verifyApiKey(req.headers.get("authorization"));
  if (!verified.ok) return NextResponse.json({ error: verified.reason }, { status: 401 });
  if (!requireScope(verified.scopes, "read:tracking")) {
    return NextResponse.json({ error: "missing scope" }, { status: 403 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "500", 10), 5000);

  const pieces = await prisma.mailPiece.findMany({
    where: {
      companyId: verified.companyId,
      ...(since ? { updatedAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      imb: true,
      status: true,
      recipientName: true,
      city: true,
      state: true,
      zip5: true,
      expectedInHomeDate: true,
      firstScanAt: true,
      deliveredAt: true,
      daysToDeliver: true,
      campaignId: true,
      mailBatchId: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    companyId: verified.companyId,
    count: pieces.length,
    limit,
    pieces,
  });
}
