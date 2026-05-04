/**
 * USPS Informed Visibility Mail Tracking & Reporting (IV-MTR) ingestion.
 *
 * Two entry points:
 *   - ingestIVFile(payload): parse a JSON or CSV scan file and upsert ScanEvents
 *   - rollupMailPieceStatus(mailPieceId): recompute MailPiece.status + counts after new scans
 *
 * USPS delivers scan records via S3 push or SFTP. Each record represents one
 * scan of one IMb at one facility. Shape we expect (IV-MTR JSON v2):
 *
 *   {
 *     "imb": "0012345678901234567890123456789",
 *     "scanDateTime": "2026-04-18T14:23:07-05:00",
 *     "operationCode": "92",
 *     "operationDesc": "Processed at SCF",
 *     "facilityZip": "20099",
 *     "facilityCity": "Merrifield",
 *     "facilityState": "VA",
 *     "facilityType": "SCF",
 *     "machineId": "APPS-03",
 *     "runId": "20260418-A3",
 *     "predictedDeliveryDate": "2026-04-21"
 *   }
 *
 * CSV format is the same columns, header row required.
 */

import prisma from "@/lib/prisma";
import { mapOperationCode, parseIMb } from "./imb";
import { USPS_MID } from "../usps-config";

export interface IVScanRecord {
  imb: string;
  scanDateTime: string;
  operationCode?: string;
  operationDesc?: string;
  facilityZip?: string;
  facilityCity?: string;
  facilityState?: string;
  facilityType?: string;
  machineId?: string;
  runId?: string;
  predictedDeliveryDate?: string;
}

/**
 * USPS IV-MTR push format is inconsistent across tenants and contracts. Real
 * payloads we've seen / could see field names like:
 *   imb / IMb / IMB / intelligentMailBarcode / barcode / impb / ImbSerial
 *   scanDateTime / scanDate / eventDateTime / eventTime / dateTime
 *   operationCode / opCode / scanCode / eventCode
 *   operationDesc / scanDesc / eventDescription
 *   facilityZip / scanFacilityZip / locationZip
 *   facilityCity / scanFacilityCity / locationCity
 *   facilityState / scanFacilityState / locationState
 * This normalizer accepts any of these and produces our canonical IVScanRecord.
 * Returns null if it can't extract a valid IMb + scan date.
 */
export function normalizeRecord(raw: Record<string, unknown>): IVScanRecord | null {
  if (!raw || typeof raw !== "object") return null;

  // Flatten known nested wrappers so we can pick fields uniformly
  const r: Record<string, unknown> = { ...raw };
  for (const wrapper of ["scanEvent", "event", "tracking", "trackingEvent", "data"]) {
    const inner = (raw as Record<string, unknown>)[wrapper];
    if (inner && typeof inner === "object") Object.assign(r, inner as Record<string, unknown>);
  }

  // Helper: case-insensitive field pick across alias list
  const pick = (...aliases: string[]): string | undefined => {
    for (const alias of aliases) {
      // exact case
      const v = r[alias];
      if (v != null && v !== "") return String(v);
      // case-insensitive scan
      const lower = alias.toLowerCase();
      for (const k of Object.keys(r)) {
        if (k.toLowerCase() === lower && r[k] != null && r[k] !== "") return String(r[k]);
      }
    }
    return undefined;
  };

  // USPS's actual push format (verified from real payload 2026-05-04):
  //   imbTrackingCode = "00271901052658190625" (20 digits = BC+STID+MID+Serial)
  //   routingCodeImbMatchingPortion = "33573680167" (11-digit routing)
  // Together these form the full 31-digit IMb.
  // Some other tenants/contracts use a different field name — try them all.
  const imbRaw = pick(
    "imbTrackingCode",      // ← USPS's actual current field name
    "intelligentMailBarcode",
    "intelligentMailBarCode",
    "imbBarcode",
    "imb",
    "IMb",
    "IMB",
    "barcode",
    "barCode",
    "impb",
  );
  const routing = pick(
    "routingCodeImbMatchingPortion", // ← USPS's actual current field name
    "routingCode",
    "imbRoutingCode",
    "routingZip",
  );
  let imb: string;
  if (imbRaw) {
    imb = imbRaw.replace(/\D/g, "");
    if (routing) imb += routing.replace(/\D/g, "");
  } else {
    // Fallback: reconstruct from MID + serial parts if no full IMb field
    const mid = pick("imbMid", "mailerId", "mid");
    const serial = pick("imbSerialNumber", "imbSerial", "serial", "serialNumber");
    if (!mid || !serial) return null;
    // We don't have BC/STID, so build a partial — won't match a stored 31-digit
    // piece but at least gets logged as UnknownImb with diagnostic info.
    imb = (mid + serial).replace(/\D/g, "");
  }
  if (imb.length < 20 || imb.length > 31) return null;

  const scanDateTime = pick(
    "scanDateTime",
    "scanDate",
    "eventDateTime",
    "eventTime",
    "eventDate",
    "dateTime",
    "datetime",
    "timestamp",
    "scanTimestamp",
  );
  if (!scanDateTime) return null;

  return {
    imb,
    scanDateTime,
    operationCode: pick("scanEventCode", "operationCode", "opCode", "scanCode", "eventCode", "stcOpCode"),
    operationDesc: pick(
      "handlingEventTypeDescription", // ← USPS's actual current field
      "operationDesc",
      "operationDescription",
      "scanDesc",
      "scanDescription",
      "eventDescription",
      "eventDesc",
    ),
    facilityZip: pick("facilityZip", "scanFacilityZip", "locationZip", "facilityZIP"),
    facilityCity: pick("facilityCity", "scanFacilityCity", "locationCity", "city"),
    facilityState: pick("facilityState", "scanFacilityState", "locationState", "state"),
    facilityType: pick("facilityType", "scanFacilityType", "locationType"),
    machineId: pick("machineId", "machineID", "scanMachineId", "machine"),
    runId: pick("runId", "runID", "scanRunId", "run"),
    predictedDeliveryDate: pick(
      "predictedDeliveryDate",
      "expectedDeliveryDate",
      "deliveryDate",
      "predictedDelivery",
    ),
  };
}

export interface IngestResult {
  ingestionId: string;
  received: number;
  inserted: number;
  skipped: number;
  unknownImbs: number;
  errors: string[];
}

/** Parse CSV text into record array. Expects header row. */
export function parseCSVScans(csv: string): IVScanRecord[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = (cols[i] ?? "").trim();
    });
    return rec as unknown as IVScanRecord;
  });
}

/** Main ingest function — feed it either a parsed record array, CSV string, or JSON string. */
export async function ingestIVFile(input: {
  source: "iv-mtr-push" | "iv-mtr-pull" | "manual";
  fileName?: string;
  body: string | IVScanRecord[] | Record<string, unknown>[];
  /** Original raw body text (so we can stash a sample on the ingestion row for debugging) */
  rawBody?: string;
}): Promise<IngestResult> {
  if (!prisma) throw new Error("Database not initialized");

  // Stash a truncated raw sample of the inbound body so admins can see USPS's
  // actual format if anything goes wrong. 4KB max — enough to read the shape.
  const rawSample =
    input.rawBody?.slice(0, 4096) ??
    (typeof input.body === "string" ? input.body.slice(0, 4096) : JSON.stringify(input.body).slice(0, 4096));

  // Parse to raw records (objects with arbitrary field names)
  let rawRecords: Record<string, unknown>[];
  if (Array.isArray(input.body)) {
    rawRecords = input.body as Record<string, unknown>[];
  } else if (input.body.trim().startsWith("[") || input.body.trim().startsWith("{")) {
    const parsed = JSON.parse(input.body);
    rawRecords = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    rawRecords = parseCSVScans(input.body) as unknown as Record<string, unknown>[];
  }

  // Normalize to canonical IVScanRecord, keeping rejects so we can log them
  const records: IVScanRecord[] = [];
  let normalizationFailures = 0;
  for (const raw of rawRecords) {
    const norm = normalizeRecord(raw);
    if (norm) records.push(norm);
    else normalizationFailures++;
  }

  const ingestion = await prisma.iVFeedIngestion.create({
    data: {
      source: input.source,
      fileName: input.fileName ?? null,
      fileSize: typeof input.body === "string" ? input.body.length : null,
      recordsReceived: rawRecords.length,
      status: "PROCESSING",
      // Stash sample raw body in errorMessage for now (no dedicated column yet)
      errorMessage: `RAW_SAMPLE: ${rawSample}`,
    },
  });

  let inserted = 0;
  let skipped = 0;
  let unknownImbs = 0;
  const errors: string[] = [];
  if (normalizationFailures > 0) {
    errors.push(
      `${normalizationFailures} record(s) failed to normalize (missing IMb or scan date). Check raw sample.`,
    );
  }

  try {
    // Preload MailPieces by the 20-digit IMb prefix (BC+STID+MID+Serial).
    // This is what USPS scans uniquely identify a piece by (imbTrackingCode);
    // the routing portion can vary in width (ZIP+4 = 9 chars, DPBC = 11 chars)
    // depending on how the piece was printed vs how USPS scanned it. Matching
    // by the 20-digit prefix sidesteps any routing-width mismatch.
    const imbs = [...new Set(records.map((r) => r.imb))];
    const prefixes = [...new Set(imbs.map((i) => i.slice(0, 20)))];
    const pieces = prefixes.length
      ? await prisma.$queryRaw<{ id: string; imb: string; campaignId: string }[]>`
          SELECT id, imb, "campaignId"
            FROM "MailPiece"
           WHERE substring(imb, 1, 20) = ANY(${prefixes}::text[])
        `
      : [];
    // Index by 20-digit prefix so scan lookup matches even when routing differs
    const pieceByImb = new Map<string, { id: string; imb: string; campaignId: string }>(
      pieces.map((p) => [p.imb.slice(0, 20), p]),
    );

    // Build bulk createMany payloads — much faster than N sequential upserts.
    // We rely on the unique constraint (imb, scanDatetime, operationCode,
    // facilityZip) + skipDuplicates to dedupe.
    const scanRows: Array<Record<string, unknown>> = [];
    const unmatchedSamples = new Map<
      string,
      {
        imb: string;
        sampleOperation: string | null;
        sampleFacilityCity: string | null;
        sampleFacilityState: string | null;
        sampleFacilityZip: string | null;
        sampleIngestionId: string;
      }
    >();

    for (const rec of records) {
      // Match by the 20-digit BC+STID+MID+Serial prefix (routing may differ)
      const piece = pieceByImb.get(rec.imb.slice(0, 20));
      if (!piece) {
        unknownImbs++;
        if (!unmatchedSamples.has(rec.imb)) {
          unmatchedSamples.set(rec.imb, {
            imb: rec.imb,
            sampleOperation: rec.operationCode ?? rec.operationDesc ?? null,
            sampleFacilityCity: rec.facilityCity ?? null,
            sampleFacilityState: rec.facilityState ?? null,
            sampleFacilityZip: rec.facilityZip ?? null,
            sampleIngestionId: ingestion.id,
          });
        }
        continue;
      }

      const scanDate = new Date(rec.scanDateTime);
      if (isNaN(scanDate.getTime())) {
        skipped++;
        errors.push(`${rec.imb}: invalid scanDateTime ${rec.scanDateTime}`);
        continue;
      }

      const operation = mapOperationCode(rec.operationCode);

      scanRows.push({
        mailPieceId: piece.id,
        imb: rec.imb,
        scanDatetime: scanDate,
        operation,
        operationCode: rec.operationCode ?? null,
        operationDesc: rec.operationDesc ?? null,
        facilityZip: rec.facilityZip ?? null,
        facilityCity: rec.facilityCity ?? null,
        facilityState: rec.facilityState ?? null,
        facilityType: rec.facilityType ?? null,
        machineId: rec.machineId ?? null,
        runId: rec.runId ?? null,
        predictedDeliveryDate: rec.predictedDeliveryDate ? new Date(rec.predictedDeliveryDate) : null,
        rawPayload: rec as unknown as object,
        ingestionId: ingestion.id,
      });
    }

    // Bulk insert scans (skipDuplicates handles re-pushes from USPS)
    if (scanRows.length > 0) {
      const result = await prisma.scanEvent.createMany({
        data: scanRows as never,
        skipDuplicates: true,
      });
      inserted = result.count;
      skipped += scanRows.length - result.count;
    }

    // Bulk-persist unmatched IMbs (orphan scans we couldn't match)
    if (unmatchedSamples.size > 0) {
      const runStart = new Date();
      const samplesArr = [...unmatchedSamples.values()];
      try {
        await prisma.unknownImb.createMany({ data: samplesArr, skipDuplicates: true });
      } catch (e) {
        errors.push(`unknownImb createMany: ${(e as Error).message}`);
      }
      try {
        await prisma.unknownImb.updateMany({
          where: {
            imb: { in: samplesArr.map((s) => s.imb) },
            firstSeenAt: { lt: runStart },
          },
          data: {
            lastSeenAt: new Date(),
            occurrences: { increment: 1 },
          },
        });
      } catch (e) {
        errors.push(`unknownImb updateMany: ${(e as Error).message}`);
      }
    }

    // Recompute MailPiece statuses for affected pieces (best effort — don't
    // let one rollup failure block the whole ingestion's success status)
    const affectedIds = [...new Set(pieces.map((p) => p.id))];
    for (const id of affectedIds) {
      await rollupMailPieceStatus(id).catch((e) =>
        errors.push(`rollup ${id}: ${(e as Error).message}`),
      );
    }
    const affectedCampaignIds = [...new Set(pieces.map((p) => p.campaignId))];
    for (const campaignId of affectedCampaignIds) {
      await rollupOrdersForCampaign(campaignId).catch((e) =>
        errors.push(`order rollup ${campaignId}: ${(e as Error).message}`),
      );
    }

    // Decide final status: COMPLETED if any scans landed (or if there was
    // genuinely nothing matchable to land); FAILED only on hard problems.
    const status =
      normalizationFailures === rawRecords.length && rawRecords.length > 0
        ? "FAILED" // every single record was unparseable
        : "COMPLETED";

    await prisma.iVFeedIngestion.update({
      where: { id: ingestion.id },
      data: {
        recordsInserted: inserted,
        recordsSkipped: skipped,
        status,
        errorMessage: errors.length
          ? `${errors.slice(0, 20).join("; ")} | RAW_SAMPLE: ${rawSample}`
          : `RAW_SAMPLE: ${rawSample}`,
        completedAt: new Date(),
      },
    });

    return {
      ingestionId: ingestion.id,
      received: rawRecords.length,
      inserted,
      skipped,
      unknownImbs,
      errors,
    };
  } catch (e) {
    // Hard failure — mark FAILED with the error and rethrow so caller sees it
    const msg = (e as Error).message;
    console.error("[ingestIVFile] FAILED", msg, (e as Error).stack);
    await prisma.iVFeedIngestion
      .update({
        where: { id: ingestion.id },
        data: {
          status: "FAILED",
          errorMessage: `FATAL: ${msg} | RAW_SAMPLE: ${rawSample}`,
          completedAt: new Date(),
        },
      })
      .catch(() => {});
    throw e;
  }
}

/**
 * For every Order on this campaign that's been DROPPED/DELIVERING,
 * roll its piece-level delivery data up into the Order.status:
 *   DROPPED      = no pieces delivered yet
 *   DELIVERING   = some pieces delivered
 *   COMPLETE     = ≥ 80% of pieces delivered (or all scanned at least once)
 */
export async function rollupOrdersForCampaign(campaignId: string) {
  if (!prisma) throw new Error("Database not initialized");
  const orders = await prisma.order.findMany({
    where: {
      campaignId,
      status: { in: ["DROPPED", "DELIVERING"] },
    },
    select: { id: true, status: true, quantity: true },
  });
  for (const order of orders) {
    // Count delivered pieces on this campaign (we don't yet link piece→order
    // directly, so approximate by campaign; good enough for single-order-per-
    // campaign and surfaces progress for recurring campaigns too).
    const totalPieces = await prisma.mailPiece.count({ where: { campaignId } });
    if (totalPieces === 0) continue;
    const delivered = await prisma.mailPiece.count({
      where: {
        campaignId,
        status: { in: ["DELIVERED", "DELIVERED_INFERRED"] },
      },
    });
    const pct = delivered / totalPieces;
    let next: "DROPPED" | "DELIVERING" | "COMPLETE" = order.status as
      | "DROPPED"
      | "DELIVERING";
    if (pct >= 0.8) next = "COMPLETE";
    else if (delivered > 0) next = "DELIVERING";
    if (next !== order.status) {
      await prisma.order.update({ where: { id: order.id }, data: { status: next } });
    }
  }
}

/** Recompute a MailPiece's status/timestamps from its ScanEvents. */
export async function rollupMailPieceStatus(mailPieceId: string) {
  if (!prisma) throw new Error("Database not initialized");

  const piece = await prisma.mailPiece.findUnique({
    where: { id: mailPieceId },
    include: { scanEvents: { orderBy: { scanDatetime: "asc" } } },
  });
  if (!piece) return;

  const events = piece.scanEvents;
  if (events.length === 0) return;

  const firstScanAt = events[0].scanDatetime;
  const lastScanAt = events[events.length - 1].scanDatetime;

  let status: "PENDING" | "ACCEPTED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "DELIVERED_INFERRED" | "UNDELIVERABLE" = "ACCEPTED";
  let deliveredAt: Date | null = null;

  const has = (op: string) => events.some((e) => e.operation === op);
  if (has("UNDELIVERABLE")) status = "UNDELIVERABLE";
  else if (has("DELIVERED")) {
    status = "DELIVERED";
    deliveredAt = events.find((e) => e.operation === "DELIVERED")!.scanDatetime;
  } else if (has("OUT_FOR_DELIVERY")) {
    const ofd = events.find((e) => e.operation === "OUT_FOR_DELIVERY")!.scanDatetime;
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    if (Date.now() - ofd.getTime() > twoDays) {
      status = "DELIVERED_INFERRED";
      deliveredAt = new Date(ofd.getTime() + 24 * 60 * 60 * 1000);
    } else {
      status = "OUT_FOR_DELIVERY";
    }
  } else if (events.length > 1) status = "IN_TRANSIT";

  const daysToDeliver =
    deliveredAt && firstScanAt
      ? Math.round((deliveredAt.getTime() - firstScanAt.getTime()) / (24 * 60 * 60 * 1000))
      : null;

  await prisma.mailPiece.update({
    where: { id: mailPieceId },
    data: { status, firstScanAt, lastScanAt, deliveredAt, daysToDeliver },
  });
}

/** Import a customer mail file (CSV) and create MailPiece rows with IMbs. */
export async function importMailFile(params: {
  campaignId: string;
  mailBatchId?: string;
  rows: Array<{
    imb: string;
    recipientName?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip5?: string;
    zip4?: string;
    expectedInHomeDate?: string;
    isSeed?: boolean;
  }>;
}): Promise<{ inserted: number; skipped: number }> {
  if (!prisma) throw new Error("Database not initialized");

  // Look up the campaign's company once so we can denormalize companyId onto each MailPiece
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
    select: { companyId: true },
  });
  if (!campaign) throw new Error(`Campaign ${params.campaignId} not found`);

  // If a batch was supplied but has no mailerId, stamp C&D's default MID onto it
  if (params.mailBatchId) {
    const batch = await prisma.mailBatch.findUnique({
      where: { id: params.mailBatchId },
      select: { mailerId: true },
    });
    if (batch && !batch.mailerId) {
      await prisma.mailBatch.update({
        where: { id: params.mailBatchId },
        data: { mailerId: USPS_MID },
      });
    }
  }

  let inserted = 0;
  let skipped = 0;

  for (const row of params.rows) {
    const parsed = parseIMb(row.imb);
    if (!parsed) {
      skipped++;
      continue;
    }
    try {
      await prisma.mailPiece.create({
        data: {
          campaignId: params.campaignId,
          companyId: campaign.companyId,
          mailBatchId: params.mailBatchId,
          imb: row.imb.replace(/\D/g, ""),
          imbBarcodeId: parsed.barcodeId,
          imbServiceType: parsed.serviceType,
          imbMailerId: parsed.mailerId,
          imbSerial: parsed.serial,
          imbRoutingZip: parsed.routingZip || null,
          recipientName: row.recipientName,
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          city: row.city,
          state: row.state,
          zip5: row.zip5,
          zip4: row.zip4,
          expectedInHomeDate: row.expectedInHomeDate ? new Date(row.expectedInHomeDate) : null,
          isSeed: row.isSeed ?? false,
          status: "PENDING",
        },
      });
      inserted++;
    } catch {
      skipped++; // likely duplicate IMb
    }
  }

  // Auto-resolve any UnknownImb rows whose IMbs we just imported.
  // Next time a scan for them arrives, it'll match the new MailPiece.
  const importedImbs = params.rows.map((r) => r.imb.replace(/\D/g, ""));
  if (importedImbs.length > 0) {
    await prisma.unknownImb
      .updateMany({
        where: { imb: { in: importedImbs }, isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      })
      .catch(() => {});
  }

  return { inserted, skipped };
}
