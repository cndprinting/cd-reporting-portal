/**
 * Mail batch CRUD.
 * POST /api/mail-batches  → create a new MailBatch, auto-stamped with C&D's MID
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { USPS_MID } from "@/lib/usps-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { campaignId, batchName, quantity, dropDate, mailClass, mailShape } = await req.json();
  if (!campaignId || !batchName || !dropDate) {
    return NextResponse.json({ error: "campaignId, batchName, dropDate required" }, { status: 400 });
  }

  const batch = await prisma.mailBatch.create({
    data: {
      campaignId,
      batchName,
      quantity: quantity ?? 0,
      dropDate: new Date(dropDate),
      mailClass: mailClass ?? "First-Class",
      mailShape: mailShape ?? "letter",
      mailerId: USPS_MID,
      status: "pending",
    },
  });
  return NextResponse.json(batch);
}
