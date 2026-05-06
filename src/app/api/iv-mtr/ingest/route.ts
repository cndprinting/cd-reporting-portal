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

  // 1. Header variants USPS / generic webhook providers use
  for (const header of [
    "x-iv-mtr-key",
    "x-webhook-secret",
    "x-usps-webhook-secret",
    "x-api-key",
    "x-secret",
  ]) {
    if (matchesSecret(req.headers.get(header))) return true;
  }

  // 2. HTTP Basic Auth
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

  // 3. Bearer with our secret
  if (auth?.startsWith("Bearer ") && matchesSecret(auth.slice(7))) return true;

  // 4. secret in JSON body
  if (body.startsWith("{")) {
    try {
      const parsed = JSON.parse(body);
      if (matchesSecret(parsed.secret) || matchesSecret(parsed.apiKey) || matchesSecret(parsed.key))
        return true;
    } catch {
      /* ignore */
    }
  }

  return false;
}

/**
 * Heuristic: does this body LOOK like a real USPS IV-MTR push (regardless of
 * auth)? If yes and auth fails, we still process it — losing real scans is
 * worse than processing a small number of misdirected/spoofed payloads. The
 * payload contains IMb data we'd otherwise lose forever (USPS warned us they
 * won't retry on 401/403).
 */
function looksLikeUspsPayload(body: string): boolean {
  if (!body || body.length < 50) return false;
  // USPS IV-MTR JSON has these unique field names in production payloads
  const markers = [
    "imbTrackingCode",
    "scanDatetime",
    "scanEventCode",
    "imbMid",
    "routingCodeImbMatchingPortion",
    "handlingEventTypeDescription",
  ];
  let hits = 0;
  for (const m of markers) if (body.includes(m)) hits++;
  return hits >= 2;
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

  // Auth check, but DO NOT 401 USPS — they'll drop events permanently.
  // Always return 200 OK to USPS-shaped requests; only refuse to process
  // requests that fail BOTH our secret check AND the USPS-payload heuristic.
  const authed = isAuthorized(req, body);
  const looksLegit = looksLikeUspsPayload(body);

  if (!authed && !looksLegit) {
    // Genuinely unknown source — refuse processing but still 200 so we don't
    // create a feedback loop with whatever's calling us. Logged for review.
    console.warn("[iv-mtr/ingest] rejected: no auth + payload doesn't look like USPS", {
      bodyPreview: body.slice(0, 200),
      headerKeys: [...req.headers.keys()],
    });
    return NextResponse.json({ ok: true, processed: false, reason: "unauthorized" });
  }

  if (!authed && looksLegit) {
    // Auth missing but payload IS shaped like USPS IV-MTR — process it
    // anyway (losing real scans is worse). Surface the auth gap loudly so
    // we can fix the secret/header mismatch.
    console.warn("[iv-mtr/ingest] processing without auth — payload looks like USPS, secret mismatch?", {
      bodyPreview: body.slice(0, 200),
      headerKeys: [...req.headers.keys()],
    });
  }

  try {
    let parsedBody: string | IVScanRecord[] | Record<string, unknown>[] = body;
    if (contentType.includes("json") || body.trimStart().startsWith("{") || body.trimStart().startsWith("[")) {
      const obj = JSON.parse(body);
      // USPS may wrap events in many shapes — try every common one
      if (Array.isArray(obj)) parsedBody = obj;
      else if (Array.isArray(obj.events)) parsedBody = obj.events;
      else if (Array.isArray(obj.trackingEvents)) parsedBody = obj.trackingEvents;
      else if (Array.isArray(obj.scans)) parsedBody = obj.scans;
      else if (Array.isArray(obj.scanEvents)) parsedBody = obj.scanEvents;
      else if (Array.isArray(obj.records)) parsedBody = obj.records;
      else if (Array.isArray(obj.data)) parsedBody = obj.data;
      else if (Array.isArray(obj.results)) parsedBody = obj.results;
      else if (Array.isArray(obj.items)) parsedBody = obj.items;
      else parsedBody = [obj]; // single event push
    } else if (contentType.includes("xml") || body.trimStart().startsWith("<")) {
      parsedBody = parseXMLScans(body);
    }

    const result = await ingestIVFile({
      source: "iv-mtr-push",
      fileName,
      body: parsedBody,
      rawBody: body, // so a sample lands on the IVFeedIngestion row for debugging
    });
    return NextResponse.json(result);
  } catch (e) {
    // Never 5xx to USPS — they treat that as a delivery failure too. Always
    // 200 so the webhook contract is honored; log + surface on next health check.
    console.error("[iv-mtr/ingest] error", e);
    return NextResponse.json({
      ok: true,
      processed: false,
      error: (e as Error).message,
    });
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
