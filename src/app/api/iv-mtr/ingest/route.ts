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
    let parsedBody: unknown = body;
    if (contentType.includes("json")) {
      parsedBody = JSON.parse(body);
    } else if (contentType.includes("xml") || body.trimStart().startsWith("<")) {
      // USPS Mail.XML / IMb Tracing .pkg feed — naive scan-record extraction.
      // Pulls <ScanEvent> (or <Scan>) elements into our IVScanRecord shape.
      parsedBody = parseXMLScans(body);
    }
    // else: treat as CSV / delimited — ingestIVFile handles that case natively

    const result = await ingestIVFile({
      source: "iv-mtr-push",
      fileName,
      body: parsedBody as string | import("@/lib/services/iv-mtr-ingest").IVScanRecord[],
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Very-light XML scan parser. Extracts fields via regex rather than pulling in
 * an XML dependency. Works on the USPS IMb Tracing / Mail.XML feed shape:
 *   <ScanEvents>
 *     <ScanEvent>
 *       <IMb>...</IMb>
 *       <ScanDateTime>...</ScanDateTime>
 *       <OperationCode>...</OperationCode>
 *       <FacilityZip>...</FacilityZip>
 *       ...
 *     </ScanEvent>
 *   </ScanEvents>
 */
function parseXMLScans(xml: string): import("@/lib/services/iv-mtr-ingest").IVScanRecord[] {
  const records: import("@/lib/services/iv-mtr-ingest").IVScanRecord[] = [];
  const scanRegex = /<(?:ScanEvent|Scan)\b[^>]*>([\s\S]*?)<\/(?:ScanEvent|Scan)>/g;
  const fieldRegex = (name: string) =>
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  const pick = (xml: string, name: string): string | undefined => {
    const m = xml.match(fieldRegex(name));
    return m?.[1]?.trim();
  };
  let m: RegExpExecArray | null;
  while ((m = scanRegex.exec(xml))) {
    const blob = m[1];
    const imb = pick(blob, "IMb") ?? pick(blob, "ImbSerialNumber") ?? pick(blob, "IntelligentMailBarcode");
    const scanDateTime = pick(blob, "ScanDateTime") ?? pick(blob, "EventDateTime") ?? pick(blob, "DateTime");
    if (!imb || !scanDateTime) continue;
    records.push({
      imb,
      scanDateTime,
      operationCode: pick(blob, "OperationCode") ?? pick(blob, "OpCode"),
      operationDesc: pick(blob, "OperationDescription") ?? pick(blob, "EventDescription"),
      facilityZip: pick(blob, "FacilityZip") ?? pick(blob, "FacilityZipCode"),
      facilityCity: pick(blob, "FacilityCity"),
      facilityState: pick(blob, "FacilityState"),
      facilityType: pick(blob, "FacilityType"),
      machineId: pick(blob, "MachineId") ?? pick(blob, "MachineID"),
      runId: pick(blob, "RunId") ?? pick(blob, "RunID"),
      predictedDeliveryDate: pick(blob, "PredictedDeliveryDate"),
    });
  }
  return records;
}

// USPS sends a test ping as GET first before the first POST — respond 200
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, message: "IV-MTR ingest endpoint ready" });
}
