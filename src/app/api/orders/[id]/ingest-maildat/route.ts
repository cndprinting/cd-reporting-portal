/**
 * Manual AccuZIP Mail.dat upload for a specific Order.
 *
 * POST /api/orders/:id/ingest-maildat
 *   Content-Type: multipart/form-data; field "file"
 *
 *   Accepts:
 *     - A single .pbc file (piece barcode, the IDEAlliance standard piece file)
 *     - A zipped Presort folder containing maildat.pbc (+ other mail.dat files)
 *
 * Flow:
 *   1. Read the upload
 *   2. If ZIP: find the first entry whose basename is "maildat.pbc"
 *   3. Parse IMbs via parsePBC()
 *   4. Import as MailPieces on this order's campaign (reuses importMailFile
 *      so denormalization, dedup-by-IMb, etc. is identical to push/pull paths)
 *   5. If cleansedListUrl isn't set, optionally auto-populate finalQuantity
 *      to the extracted piece count so the Final Quantity card pre-fills
 *
 * Admin / Account Manager only.
 */

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { parsePBC } from "@/lib/services/maildat";
import { importMailFile } from "@/lib/services/iv-mtr-ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

async function extractPbcText(buffer: Buffer, filename: string): Promise<{ text: string; foundAs: string }> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(buffer);
    const entry = Object.values(zip.files).find((f) => {
      if (f.dir) return false;
      const base = f.name.split("/").pop()?.toLowerCase() ?? "";
      return base === "maildat.pbc";
    });
    if (!entry) {
      throw new Error(
        "ZIP does not contain a maildat.pbc file. Expected the full Presort folder.",
      );
    }
    const text = await entry.async("string");
    return { text, foundAs: entry.name };
  }
  // Assume raw .pbc text
  return { text: buffer.toString("utf8"), foundAs: filename };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      campaignId: true,
      quantity: true,
      orderCode: true,
    },
  });
  if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 });

  // Grab file from multipart form
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file field missing from form" }, { status: 400 });
  }
  const fileObj = file as File;
  const buffer = Buffer.from(await fileObj.arrayBuffer());

  let pbcText: string;
  let foundAs: string;
  try {
    const result = await extractPbcText(buffer, fileObj.name);
    pbcText = result.text;
    foundAs = result.foundAs;
  } catch (e) {
    return NextResponse.json(
      { error: `Could not read maildat.pbc: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  // Parse PBC into {jobId, pieceId, imb}
  let pieces: ReturnType<typeof parsePBC>;
  try {
    pieces = parsePBC(pbcText);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to parse PBC: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  const validPieces = pieces.filter((p) => p.imb && /^\d{20,31}$/.test(p.imb));
  if (validPieces.length === 0) {
    return NextResponse.json(
      {
        error:
          "No valid IMbs extracted from the file. Check that you uploaded a real maildat.pbc (or a ZIP containing one).",
        sampleRows: pieces.slice(0, 3),
      },
      { status: 400 },
    );
  }

  // Create a MailBatch so we can tag these pieces to this specific upload
  const batch = await prisma.mailBatch.create({
    data: {
      campaignId: order.campaignId,
      batchName: `${order.orderCode} manual AccuZIP upload ${new Date().toISOString().slice(0, 16)}`,
      quantity: validPieces.length,
      dropDate: new Date(),
      status: "processed",
    },
  });

  // Import — denormalizes companyId onto each MailPiece, dedupes IMbs, etc.
  const result = await importMailFile({
    campaignId: order.campaignId,
    mailBatchId: batch.id,
    rows: validPieces.map((p) => ({ imb: p.imb })),
  });

  return NextResponse.json({
    ok: true,
    mailBatchId: batch.id,
    pbcFile: foundAs,
    totalRowsParsed: pieces.length,
    validImbs: validPieces.length,
    inserted: result.inserted,
    skippedDuplicates: result.skipped,
  });
}
