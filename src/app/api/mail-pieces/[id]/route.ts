/**
 * Piece-level detail endpoint.
 * GET /api/mail-pieces/:id
 *
 * Returns the full MailPiece with all ScanEvents ordered by time,
 * parsed IMb components, and campaign/batch context.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseIMb } from "@/lib/services/imb";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!prisma) return NextResponse.json(demoPiece(id));

  const piece = await prisma.mailPiece.findUnique({
    where: { id },
    include: {
      campaign: { select: { id: true, name: true, campaignCode: true } },
      company: { select: { id: true, name: true } },
      mailBatch: {
        select: {
          id: true,
          batchName: true,
          dropDate: true,
          mailerId: true,
          mailClass: true,
          mailShape: true,
        },
      },
      scanEvents: { orderBy: { scanDatetime: "asc" } },
    },
  });

  if (!piece) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    ...piece,
    imbParsed: parseIMb(piece.imb),
  });
}

function demoPiece(id: string) {
  const now = Date.now();
  const scans = [
    { op: "ORIGIN_ACCEPTANCE", opCode: "10", hrAgo: 96, facility: "Daytona Beach, FL 32114", type: "DDU" },
    { op: "ORIGIN_PROCESSED", opCode: "92", hrAgo: 84, facility: "Jacksonville P&DC, FL 32099", type: "P&DC" },
    { op: "IN_TRANSIT", opCode: "80", hrAgo: 72, facility: "Jacksonville NDC, FL 32099", type: "NDC" },
    { op: "DESTINATION_PROCESSED", opCode: "23", hrAgo: 48, facility: "Orlando P&DC, FL 32824", type: "P&DC" },
    { op: "DESTINATION_DELIVERY", opCode: "35", hrAgo: 24, facility: "Port Orange, FL 32127", type: "DDU" },
    { op: "OUT_FOR_DELIVERY", opCode: "42", hrAgo: 8, facility: "Port Orange, FL 32127", type: "DDU" },
    { op: "DELIVERED", opCode: "81", hrAgo: 2, facility: "Port Orange, FL 32127", type: "DDU" },
  ];
  return {
    id,
    imb: "00300901052658000001321270000",
    imbParsed: {
      barcodeId: "00",
      serviceType: "300",
      mailerId: "901052658",
      serial: "000001",
      routingZip: "32127000000",
      mailerIdLength: 9,
    },
    recipientName: "Alex Morgan",
    addressLine1: "125 Silver Beach Ave",
    city: "Port Orange",
    state: "FL",
    zip5: "32127",
    zip4: null,
    status: "DELIVERED",
    expectedInHomeDate: new Date(now - 3 * 86400000).toISOString(),
    firstScanAt: new Date(now - 96 * 3600000).toISOString(),
    deliveredAt: new Date(now - 2 * 3600000).toISOString(),
    daysToDeliver: 4,
    isSeed: false,
    campaign: {
      id: "camp-1",
      name: "Spring Homeowner Mailer",
      campaignCode: "CD-2026-001",
    },
    company: { id: "demo-company-2", name: "Sunshine Realty Group" },
    mailBatch: {
      id: "demo-batch-1",
      batchName: "Drop 1 — Volusia County",
      dropDate: new Date(now - 5 * 86400000).toISOString(),
      mailerId: "901052658",
      mailClass: "First-Class",
      mailShape: "letter",
    },
    scanEvents: scans.map((s, i) => ({
      id: `ev-${i}`,
      operation: s.op,
      operationCode: s.opCode,
      scanDatetime: new Date(now - s.hrAgo * 3600000).toISOString(),
      facilityCity: s.facility.split(",")[0],
      facilityState: "FL",
      facilityZip: s.facility.match(/\d{5}/)?.[0] ?? null,
      facilityType: s.type,
      machineId: `APPS-${(i % 4) + 1}`,
      runId: `RUN-${20260415 + i}`,
      predictedDeliveryDate: new Date(now - 2 * 3600000).toISOString(),
    })),
  };
}
