/**
 * USPS IV-MTR ingestion endpoint.
 *
 * POST /api/iv-mtr/ingest
 *   - Accept either application/json (array of scan records) or text/csv
 *   - Auth: shared-secret header `x-iv-mtr-key` matching IV_MTR_INGEST_KEY env
 *   - Used by: USPS push target (S3→lambda→here), scheduled pull worker, or
 *     manual upload from admin.
 *
 * Response: { ingestionId, received, inserted, skipped, unknownImbs, errors[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestIVFile } from "@/lib/services/iv-mtr-ingest";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min for large batches

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-iv-mtr-key");
  if (!key || key !== process.env.IV_MTR_INGEST_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const body = await req.text();
  const fileName = req.headers.get("x-file-name") ?? undefined;

  try {
    const result = await ingestIVFile({
      source: "iv-mtr-push",
      fileName,
      body: contentType.includes("json") ? JSON.parse(body) : body,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
