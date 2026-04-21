/**
 * USPS IV-MTR ingestion endpoint.
 *
 * POST /api/iv-mtr/ingest
 *   - Accept either application/json (array of scan records), text/csv, or XML
 *   - Auth (either works):
 *     - Header `x-iv-mtr-key` matching IV_MTR_INGEST_KEY env (for manual/internal callers)
 *     - HTTP Basic Auth where username=IV_MTR_PUSH_USER, password=IV_MTR_INGEST_KEY
 *       (this is the format USPS IV-MTR uses when it pushes to "HTTPS JSON" targets
 *       registered in its Address Book)
 *   - Used by: USPS IV-MTR push target, scheduled pull worker, or manual admin upload
 *
 * Response: { ingestionId, received, inserted, skipped, unknownImbs, errors[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestIVFile } from "@/lib/services/iv-mtr-ingest";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min for large batches

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.IV_MTR_INGEST_KEY;
  if (!secret) return false;

  // Option 1: custom header (internal/manual callers)
  const headerKey = req.headers.get("x-iv-mtr-key");
  if (headerKey && headerKey === secret) return true;

  // Option 2: HTTP Basic Auth (USPS IV-MTR push format)
  const auth = req.headers.get("authorization");
  if (auth && auth.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(auth.slice("Basic ".length), "base64").toString("utf-8");
      const [user, pass] = decoded.split(":");
      const expectedUser = process.env.IV_MTR_PUSH_USER ?? "cndprinting";
      if (user === expectedUser && pass === secret) return true;
    } catch {
      // fall through
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
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

// USPS sends a test ping as GET first before the first POST — respond 200
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, message: "IV-MTR ingest endpoint ready" });
}
