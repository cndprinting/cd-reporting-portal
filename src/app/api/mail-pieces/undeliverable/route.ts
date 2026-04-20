/**
 * Undeliverable (UAA) export.
 * GET /api/mail-pieces/undeliverable?campaignId=...  (or ?companyId=...)
 *   → CSV download of every mailpiece with status = UNDELIVERABLE
 *
 * Use this to feed back into the customer's CRM for address cleanup.
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
  const campaignId = url.searchParams.get("campaignId") ?? undefined;
  const companyId = url.searchParams.get("companyId") ?? undefined;

  const where: Record<string, unknown> = { status: "UNDELIVERABLE" };
  if (campaignId) where.campaignId = campaignId;
  if (companyId) where.companyId = companyId;

  // Scope customers to their own company
  if (session.role === "CUSTOMER") {
    where.companyId = session.companyId;
  }

  const pieces = await prisma.mailPiece.findMany({
    where,
    select: {
      imb: true,
      recipientName: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      zip5: true,
      zip4: true,
      lastScanAt: true,
      campaign: { select: { name: true, campaignCode: true } },
      scanEvents: {
        where: { operation: "UNDELIVERABLE" },
        orderBy: { scanDatetime: "desc" },
        take: 1,
        select: { operationDesc: true, facilityZip: true, scanDatetime: true },
      },
    },
    take: 50_000,
  });

  const headers = [
    "campaign_code",
    "campaign",
    "imb",
    "recipient",
    "address1",
    "address2",
    "city",
    "state",
    "zip5",
    "zip4",
    "uaa_reason",
    "uaa_facility_zip",
    "uaa_date",
  ];

  const lines = [headers.join(",")];
  for (const p of pieces) {
    const ev = p.scanEvents[0];
    const row = [
      p.campaign.campaignCode,
      p.campaign.name,
      p.imb,
      p.recipientName ?? "",
      p.addressLine1 ?? "",
      p.addressLine2 ?? "",
      p.city ?? "",
      p.state ?? "",
      p.zip5 ?? "",
      p.zip4 ?? "",
      ev?.operationDesc ?? "Undeliverable",
      ev?.facilityZip ?? "",
      ev?.scanDatetime?.toISOString() ?? p.lastScanAt?.toISOString() ?? "",
    ];
    lines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="uaa-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
