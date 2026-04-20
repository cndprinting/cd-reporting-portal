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
  body: string | IVScanRecord[];
}): Promise<IngestResult> {
  if (!prisma) throw new Error("Database not initialized");

  const records: IVScanRecord[] = Array.isArray(input.body)
    ? input.body
    : input.body.trim().startsWith("[") || input.body.trim().startsWith("{")
    ? JSON.parse(input.body)
    : parseCSVScans(input.body);

  const ingestion = await prisma.iVFeedIngestion.create({
    data: {
      source: input.source,
      fileName: input.fileName ?? null,
      fileSize: typeof input.body === "string" ? input.body.length : null,
      recordsReceived: records.length,
      status: "PROCESSING",
    },
  });

  let inserted = 0;
  let skipped = 0;
  let unknownImbs = 0;
  const errors: string[] = [];

  // Preload all MailPiece IDs for the IMbs in this batch in one query
  const imbs = [...new Set(records.map((r) => r.imb))];
  const pieces = await prisma.mailPiece.findMany({
    where: { imb: { in: imbs } },
    select: { id: true, imb: true, campaignId: true },
  });
  const pieceByImb = new Map(pieces.map((p) => [p.imb, p]));

  for (const rec of records) {
    try {
      const piece = pieceByImb.get(rec.imb);
      if (!piece) {
        unknownImbs++;
        continue; // scan for an IMb we don't know about — log but skip
      }

      const scanDate = new Date(rec.scanDateTime);
      const operation = mapOperationCode(rec.operationCode) as
        | "ORIGIN_ACCEPTANCE"
        | "ORIGIN_PROCESSED"
        | "IN_TRANSIT"
        | "DESTINATION_PROCESSED"
        | "DESTINATION_DELIVERY"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "UNDELIVERABLE"
        | "OTHER";

      // Dedup via unique index (imb, scanDatetime, operationCode, facilityZip)
      const result = await prisma.scanEvent.upsert({
        where: {
          imb_scanDatetime_operationCode_facilityZip: {
            imb: rec.imb,
            scanDatetime: scanDate,
            operationCode: rec.operationCode ?? "",
            facilityZip: rec.facilityZip ?? "",
          },
        },
        create: {
          mailPieceId: piece.id,
          imb: rec.imb,
          scanDatetime: scanDate,
          operation,
          operationCode: rec.operationCode,
          operationDesc: rec.operationDesc,
          facilityZip: rec.facilityZip,
          facilityCity: rec.facilityCity,
          facilityState: rec.facilityState,
          facilityType: rec.facilityType,
          machineId: rec.machineId,
          runId: rec.runId,
          predictedDeliveryDate: rec.predictedDeliveryDate ? new Date(rec.predictedDeliveryDate) : null,
          rawPayload: rec as unknown as object,
          ingestionId: ingestion.id,
        },
        update: {}, // no-op on duplicate
      });
      if (result) inserted++;
      else skipped++;
    } catch (e) {
      errors.push(`${rec.imb}: ${(e as Error).message}`);
      skipped++;
    }
  }

  // Recompute status for every affected mailpiece
  const affectedIds = [...new Set(pieces.map((p) => p.id))];
  for (const id of affectedIds) {
    await rollupMailPieceStatus(id).catch((e) => errors.push(`rollup ${id}: ${e.message}`));
  }

  await prisma.iVFeedIngestion.update({
    where: { id: ingestion.id },
    data: {
      recordsInserted: inserted,
      recordsSkipped: skipped,
      status: errors.length > 0 ? "COMPLETED" : "COMPLETED",
      errorMessage: errors.length ? errors.slice(0, 20).join("; ") : null,
      completedAt: new Date(),
    },
  });

  return { ingestionId: ingestion.id, received: records.length, inserted, skipped, unknownImbs, errors };
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

  return { inserted, skipped };
}
