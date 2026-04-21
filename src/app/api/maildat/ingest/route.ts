/**
 * Auto-ingest endpoint for AccuZIP → Portal handoff.
 *
 * POST /api/maildat/ingest
 *   Accepts any of these formats in the request body:
 *     - text/csv     (IMb + address CSV export from AccuZIP)
 *     - application/json (array of piece objects)
 *     - text/plain with .pbc fixed-width Mail.dat content
 *
 * Query params (or body fields):
 *   campaignId or campaignCode — required, tells us which Campaign to attach pieces to
 *
 * Auth: same pattern as /api/iv-mtr/ingest
 *   - x-iv-mtr-key header matching IV_MTR_INGEST_KEY, OR
 *   - HTTP Basic Auth
 *
 * Intended caller: a file watcher on C&D's AccuZIP workstation that uploads
 * each new job's output file. Each mailing results in one POST with all pieces.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseIMbCSV, parseIMbJSON, parsePBC } from "@/lib/services/maildat";
import { importMailFile } from "@/lib/services/iv-mtr-ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

const SECRET = process.env.IV_MTR_INGEST_KEY ?? "";
const BASIC_USER = process.env.IV_MTR_PUSH_USER ?? "cndprinting";

function isAuthorized(req: NextRequest): boolean {
  if (!SECRET) return false;
  const headerKey = req.headers.get("x-iv-mtr-key");
  if (headerKey === SECRET) return true;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const [user, pass] = Buffer.from(auth.slice(6), "base64")
        .toString("utf-8")
        .split(":");
      if (user === BASIC_USER && pass === SECRET) return true;
    } catch {
      /* ignore */
    }
  }
  if (auth?.startsWith("Bearer ") && auth.slice(7) === SECRET) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const url = new URL(req.url);
  const campaignIdParam = url.searchParams.get("campaignId");
  const campaignCodeParam = url.searchParams.get("campaignCode");

  // Resolve target campaign
  let campaignId: string | undefined;
  if (campaignIdParam) {
    campaignId = campaignIdParam;
  } else if (campaignCodeParam) {
    const campaign = await prisma.campaign.findUnique({
      where: { campaignCode: campaignCodeParam },
      select: { id: true },
    });
    campaignId = campaign?.id;
  }
  if (!campaignId) {
    return NextResponse.json(
      {
        error:
          "campaignId or campaignCode query param required, and must match an existing Campaign",
      },
      { status: 400 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  const body = await req.text();

  console.log("[maildat/ingest]", {
    campaignId,
    contentType,
    bodyLen: body.length,
    preview: body.slice(0, 200),
  });

  // Parse based on content type / body shape
  let pieces: ReturnType<typeof parseIMbCSV> = [];
  try {
    if (contentType.includes("json") || body.trimStart().startsWith("{") || body.trimStart().startsWith("[")) {
      pieces = parseIMbJSON(body);
    } else if (contentType.includes("csv") || body.includes(",")) {
      pieces = parseIMbCSV(body);
    } else {
      // Assume fixed-width Mail.dat .pbc
      pieces = parsePBC(body).map((p) => ({ imb: p.imb, jobId: p.jobId }));
    }
  } catch (e) {
    return NextResponse.json({ error: `parse failed: ${(e as Error).message}` }, { status: 400 });
  }

  if (pieces.length === 0) {
    return NextResponse.json({ error: "no valid pieces parsed from payload" }, { status: 400 });
  }

  // Create a MailBatch for this upload
  const batch = await prisma.mailBatch.create({
    data: {
      campaignId,
      batchName: `AccuZIP auto-import ${new Date().toISOString().slice(0, 16)}`,
      quantity: pieces.length,
      dropDate: new Date(),
      status: "pending",
    },
  });

  // Import via existing path so we get companyId denormalization, status=PENDING, etc.
  const result = await importMailFile({
    campaignId,
    mailBatchId: batch.id,
    rows: pieces,
  });

  return NextResponse.json({
    campaignId,
    mailBatchId: batch.id,
    piecesParsed: pieces.length,
    ...result,
  });
}
