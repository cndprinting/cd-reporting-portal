/**
 * Admin-only: inject fake USPS scan events for demo purposes.
 * Lets us show the delivery pipeline working end-to-end without waiting for
 * real USPS data.
 *
 * POST /api/admin/mock-scan
 *   body: { campaignId: string, pctDelivered?: number (0-1, default 0.35) }
 *
 * Creates one ACCEPTED + (optionally) DELIVERED scan event per MailPiece on
 * the campaign, rolls up MailPiece + Order status.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rollupMailPieceStatus, rollupOrdersForCampaign } from "@/lib/services/iv-mtr-ingest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const campaignId: string | undefined = body.campaignId;
  const pctDelivered = Math.min(1, Math.max(0, body.pctDelivered ?? 0.35));

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const pieces = await prisma.mailPiece.findMany({
    where: { campaignId },
    select: { id: true, imb: true, city: true, state: true, zip5: true },
  });
  if (pieces.length === 0) {
    return NextResponse.json({ error: "no mail pieces on this campaign" }, { status: 404 });
  }

  const now = new Date();
  let created = 0;
  const deliverCount = Math.floor(pieces.length * pctDelivered);

  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    const acceptedAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // ACCEPTED scan at a regional sort facility
    await prisma.scanEvent
      .create({
        data: {
          mailPieceId: piece.id,
          imb: piece.imb,
          operation: "ORIGIN_ACCEPTANCE",
          scanDatetime: acceptedAt,
          facilityCity: "Kearny",
          facilityState: "NJ",
          facilityZip: "07032",
          facilityType: "NDC",
        },
      })
      .catch(() => {});

    // DELIVERED scan for first N pieces
    if (i < deliverCount) {
      const deliveredAt = new Date(acceptedAt.getTime() + 2 * 24 * 60 * 60 * 1000);
      await prisma.scanEvent
        .create({
          data: {
            mailPieceId: piece.id,
            imb: piece.imb,
            operation: "DELIVERED",
            scanDatetime: deliveredAt,
            facilityCity: piece.city ?? "Recipient",
            facilityState: piece.state ?? "NJ",
            facilityZip: piece.zip5 ?? "07740",
            facilityType: "DDU",
          },
        })
        .catch(() => {});
      created++;
    }
    await rollupMailPieceStatus(piece.id).catch(() => {});
  }

  await rollupOrdersForCampaign(campaignId);

  return NextResponse.json({
    ok: true,
    piecesTotal: pieces.length,
    deliveredScansCreated: created,
    acceptedScansCreated: pieces.length,
  });
}
