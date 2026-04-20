/**
 * Import a mail file (recipients + IMbs) into a campaign's MailPiece table.
 *
 * POST /api/mail-pieces/import
 * Body: { campaignId, mailBatchId?, rows: [{ imb, recipientName, addressLine1, city, state, zip5, zip4, expectedInHomeDate?, isSeed? }, ...] }
 */

import { NextRequest, NextResponse } from "next/server";
import { importMailFile } from "@/lib/services/iv-mtr-ingest";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { campaignId, mailBatchId, rows } = await req.json();
  if (!campaignId || !Array.isArray(rows)) {
    return NextResponse.json({ error: "campaignId and rows[] required" }, { status: 400 });
  }

  const result = await importMailFile({ campaignId, mailBatchId, rows });
  return NextResponse.json(result);
}
