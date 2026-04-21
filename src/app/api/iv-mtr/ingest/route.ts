/**
 * USPS IV-MTR / Subscriptions-Tracking ingestion endpoint.
 *
 * Accepts webhook push from USPS's Subscriptions-Tracking API (apis.usps.com)
 * as well as manual CSV/JSON uploads.
 *
 * POST /api/iv-mtr/ingest
 *   - JSON body (USPS webhook format) — primary path
 *   - XML body (legacy Mail.XML) — parsed for legacy IV-MTR feeds
 *   - CSV body — for manual admin uploads
 *
 * Auth (any of these works):
 *   - secret in body matches IV_MTR_INGEST_KEY  ← primary (USPS subscription secret)
 *   - `x-webhook-secret` header matches IV_MTR_INGEST_KEY
 *   - HTTP Basic Auth (user=IV_MTR_PUSH_USER, pass=IV_MTR_INGEST_KEY)
 *   - custom `x-iv-mtr-key` header matches IV_MTR_INGEST_KEY
 *
 * GET /api/iv-mtr/ingest
 *   - Returns 200 OK (used by USPS during subscription URL verification)
 *   - Echoes any `challenge` query param (for webhook verification handshake)
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestIVFile, type IVScanRecord } from "@/lib/services/iv-mtr-ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

const SECRET = process.env.IV_MTR_INGEST_KEY ?? "";
const BASIC_USER = process.env.IV_MTR_PUSH_USER ?? "cndprinting";

function matchesSecret(candidate: string | null | undefined): boolean {
  return !!SECRET && !!candidate && candidate === SECRET;
}

function isAuthorized(req: NextRequest, body: string): boolean {
  if (!SECRET) return false;

  // 1. Header: x-iv-mtr-key
  if (matchesSecret(req.headers.get("x-iv-mtr-key"))) return true;

  // 2. Header: x-webhook-secret (common USPS pattern)
  if (matchesSecret(req.headers.get("x-webhook-secret"))) return true;

  // 3. Header: x-usps-webhook-secret
  if (matchesSecret(req.headers.get("x-usps-webhook-secret"))) return true;

  // 4. HTTP Basic Auth
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const [user, pass] = Buffer.from(auth.slice(6), "base64")
        .toString("utf-8")
        .split(":");
      if (user === BASIC_USER && matchesSecret(pass)) return true;
    } catch {
      /* ignore */
    }
  }

  // 5. Bearer with our secret
  if (auth?.startsWith("Bearer ") && matchesSecret(auth.slice(7))) return true;

  // 6. secret in JSON body (USPS subscription sends this)
  if (body.startsWith("{")) {
    try {
      const parsed = JSON.parse(body);
      if (matchesSecret(parsed.secret)) return true;
    } catch {
      /* ignore */
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const body = await req.text();
  const fileName = req.headers.get("x-file-name") ?? undefined;

  // Log every incoming push so we can see USPS's actual format in Vercel logs
  console.log("[iv-mtr/ingest] POST", {
    contentType,
    bodyLen: body.length,
    bodyPreview: body.slice(0, 300),
    headers: Object.fromEntries(
      [...req.headers.entries()].filter(
        ([k]) => !["cookie", "authorization"].includes(k.toLowerCase()),
      ),
    ),
  });

  if (!isAuthorized(req, body)) {
    console.warn("[iv-mtr/ingest] unauthorized request");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    let parsedBody: string | IVScanRecord[] = body;
    if (contentType.includes("json") || body.trimStart().startsWith("{") || body.trimStart().startsWith("[")) {
      const obj = JSON.parse(body);
      // USPS may wrap events in { events: [...] } or { trackingEvents: [...] }
      if (Array.isArray(obj)) parsedBody = obj as IVScanRecord[];
      else if (Array.isArray(obj.events)) parsedBody = obj.events as IVScanRecord[];
      else if (Array.isArray(obj.trackingEvents)) parsedBody = obj.trackingEvents as IVScanRecord[];
      else if (Array.isArray(obj.scans)) parsedBody = obj.scans as IVScanRecord[];
      else parsedBody = [obj as IVScanRecord]; // single event push
    } else if (contentType.includes("xml") || body.trimStart().startsWith("<")) {
      parsedBody = parseXMLScans(body);
    }

    const result = await ingestIVFile({
      source: "iv-mtr-push",
      fileName,
      body: parsedBody,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[iv-mtr/ingest] error", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// USPS verification ping — return 200 with echoed challenge if present
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const challenge = url.searchParams.get("challenge") ?? url.searchParams.get("hub.challenge");
  if (challenge) {
    return new Response(challenge, {
      headers: { "content-type": "text/plain" },
    });
  }
  return NextResponse.json({
    ok: true,
    message: "IV-MTR ingest endpoint ready",
    timestamp: new Date().toISOString(),
  });
}

/** Lightweight XML scan parser for legacy Mail.XML payloads. */
function parseXMLScans(xml: string): IVScanRecord[] {
  const records: IVScanRecord[] = [];
  const scanRegex = /<(?:ScanEvent|Scan)\b[^>]*>([\s\S]*?)<\/(?:ScanEvent|Scan)>/g;
  const pick = (blob: string, name: string): string | undefined => {
    const m = blob.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    return m?.[1]?.trim();
  };
  let m: RegExpExecArray | null;
  while ((m = scanRegex.exec(xml))) {
    const blob = m[1];
    const imb =
      pick(blob, "IMb") ?? pick(blob, "ImbSerialNumber") ?? pick(blob, "IntelligentMailBarcode");
    const scanDateTime =
      pick(blob, "ScanDateTime") ?? pick(blob, "EventDateTime") ?? pick(blob, "DateTime");
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
