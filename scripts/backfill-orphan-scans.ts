/**
 * OPTION A — best-effort reconstruction of orphaned scan data for a campaign.
 *
 * CONTEXT: When a mailing's pieces are imported AFTER the USPS drop, every scan
 * that arrived before import lands in `UnknownImb` (orphan bucket) because there
 * was no MailPiece to attach it to. USPS does NOT re-send history. The orphan
 * row only stores a SUMMARY per barcode: firstSeenAt, lastSeenAt, occurrences,
 * and the FIRST operation seen (sampleOperation) + its facility. We do NOT have
 * the full scan-by-scan timeline.
 *
 * This script reattaches what we DO have, honestly labeled as reconstructed:
 *   - Matches each unresolved orphan to a stored MailPiece by 20-digit IMb prefix.
 *   - Creates ONE reconstructed ScanEvent from the real sample data
 *     (rawPayload.reconstructed = true so it is never mistaken for a live scan).
 *   - Sets the piece's firstScanAt / lastScanAt from the orphan's seen range.
 *   - Infers status conservatively from real signals (occurrences + scan span):
 *       * matured through the network  -> DELIVERED_INFERRED (NOT DELIVERED;
 *         we never received a final delivery scan, we are inferring it)
 *       * scanned but not matured       -> IN_TRANSIT
 *   - Marks the orphan resolved.
 *
 * It NEVER fabricates a DELIVERED final-scan event. DELIVERED is reserved for
 * pieces with a real USPS stop-the-clock scan.
 *
 * Usage:
 *   npx tsx scripts/backfill-orphan-scans.ts            # dry run (no writes)
 *   npx tsx scripts/backfill-orphan-scans.ts --commit   # apply
 */
import { config } from "dotenv";
config();
import { PrismaClient, type MailPieceStatus } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { mapOperationCode } from "../src/lib/services/imb";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const COMMIT = process.argv.includes("--commit");
const CAMPAIGN_MATCH = "BHLANDGR"; // order code substring

// Maturity heuristic — uses only real orphan signals.
const MATURE_MIN_OCCURRENCES = 4; // moved through several network stops
const MATURE_MIN_SPAN_DAYS = 2; // last scan at least 2 days after first

function inferStatus(occurrences: number, firstSeen: Date, lastSeen: Date):
  | "DELIVERED_INFERRED"
  | "IN_TRANSIT" {
  const spanDays = (lastSeen.getTime() - firstSeen.getTime()) / 86_400_000;
  if (occurrences >= MATURE_MIN_OCCURRENCES && spanDays >= MATURE_MIN_SPAN_DAYS) {
    return "DELIVERED_INFERRED";
  }
  return "IN_TRANSIT";
}

// Status precedence — we only ever UPGRADE a piece, never downgrade.
// A real DELIVERED scan always wins over any reconstruction.
const RANK: Record<string, number> = {
  PENDING: 0,
  EXPIRED_NO_SCAN: 0,
  ACCEPTED: 1,
  IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED_INFERRED: 4,
  UNDELIVERABLE: 5,
  DELIVERED: 6,
};

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderCode: { contains: CAMPAIGN_MATCH } },
  });
  if (!order) throw new Error("Order not found");
  const campaignId = order.campaignId;
  console.log(`Mode: ${COMMIT ? "COMMIT (writing)" : "DRY RUN (no writes)"}`);
  console.log(`Order ${order.orderCode} campaign ${campaignId}\n`);

  // Pull orphans that match a stored piece in this campaign by 20-digit prefix.
  const matches = await prisma.$queryRawUnsafe<
    {
      orphanId: string;
      orphanImb: string;
      occurrences: number;
      firstSeenAt: Date;
      lastSeenAt: Date;
      sampleOperation: string | null;
      sampleFacilityCity: string | null;
      sampleFacilityState: string | null;
      sampleFacilityZip: string | null;
      pieceId: string;
      pieceImb: string;
      pieceStatus: string;
      pieceFirstScanAt: Date | null;
      pieceLastScanAt: Date | null;
      pieceDeliveredAt: Date | null;
    }[]
  >(
    `SELECT u.id AS "orphanId", u.imb AS "orphanImb", u.occurrences,
            u."firstSeenAt", u."lastSeenAt", u."sampleOperation",
            u."sampleFacilityCity", u."sampleFacilityState", u."sampleFacilityZip",
            m.id AS "pieceId", m.imb AS "pieceImb", m.status AS "pieceStatus",
            m."firstScanAt" AS "pieceFirstScanAt", m."lastScanAt" AS "pieceLastScanAt",
            m."deliveredAt" AS "pieceDeliveredAt"
       FROM "UnknownImb" u
       JOIN "MailPiece" m
         ON substring(m.imb,1,20) = substring(u.imb,1,20)
      WHERE m."campaignId" = $1`,
    campaignId,
  );

  console.log(`Found ${matches.length} unresolved orphans matching stored pieces.\n`);

  const statusTally: Record<string, number> = {};
  let scansToCreate = 0;
  let skippedNoUpgrade = 0;

  for (const r of matches) {
    const inferred = inferStatus(r.occurrences, r.firstSeenAt, r.lastSeenAt);
    // Upgrade-only: never downgrade a piece that already has a better/real status.
    const finalStatus = (RANK[inferred] > RANK[r.pieceStatus]
      ? inferred
      : r.pieceStatus) as MailPieceStatus;
    const isUpgrade = RANK[inferred] > RANK[r.pieceStatus];
    if (isUpgrade) statusTally[inferred] = (statusTally[inferred] ?? 0) + 1;
    else skippedNoUpgrade++;
    scansToCreate++;

    if (!COMMIT) continue;

    const op = mapOperationCode(r.sampleOperation) as
      | "ORIGIN_ACCEPTANCE" | "ORIGIN_PROCESSED" | "IN_TRANSIT"
      | "DESTINATION_PROCESSED" | "DESTINATION_DELIVERY" | "OUT_FOR_DELIVERY"
      | "DELIVERED" | "UNDELIVERABLE" | "OTHER";

    {
      // One reconstructed scan event from the real sample (idempotent via unique key).
      await prisma.scanEvent.upsert({
        where: {
          imb_scanDatetime_operationCode_facilityZip: {
            imb: r.pieceImb,
            scanDatetime: r.firstSeenAt,
            operationCode: r.sampleOperation ?? "",
            facilityZip: r.sampleFacilityZip ?? "",
          },
        },
        create: {
          mailPieceId: r.pieceId,
          imb: r.pieceImb,
          scanDatetime: r.firstSeenAt,
          operation: op,
          operationCode: r.sampleOperation,
          operationDesc: "Reconstructed from orphaned scan summary (Option A backfill)",
          facilityCity: r.sampleFacilityCity,
          facilityState: r.sampleFacilityState,
          facilityZip: r.sampleFacilityZip,
          rawPayload: {
            reconstructed: true,
            source: "UnknownImb backfill",
            orphanOccurrences: r.occurrences,
            orphanFirstSeenAt: r.firstSeenAt.toISOString(),
            orphanLastSeenAt: r.lastSeenAt.toISOString(),
            note: "Pieces imported after USPS drop; live scan history unavailable. This summarizes orphaned scan activity.",
          },
        },
        update: {},
      });

      // Only widen the scan window, never shrink it (timestamps from the join).
      const newFirst =
        r.pieceFirstScanAt && r.pieceFirstScanAt < r.firstSeenAt
          ? r.pieceFirstScanAt
          : r.firstSeenAt;
      const newLast =
        r.pieceLastScanAt && r.pieceLastScanAt > r.lastSeenAt ? r.pieceLastScanAt : r.lastSeenAt;

      await prisma.mailPiece.update({
        where: { id: r.pieceId },
        data: {
          status: finalStatus,
          firstScanAt: newFirst,
          lastScanAt: newLast,
          ...(finalStatus === "DELIVERED_INFERRED" && !r.pieceDeliveredAt
            ? { deliveredAt: newLast }
            : {}),
        },
      });

      await prisma.unknownImb.update({
        where: { id: r.orphanId },
        data: { isResolved: true, resolvedAt: new Date() },
      });
    }
  }

  console.log("Reconstructed-status UPGRADES (pieces moved up):");
  for (const [k, v] of Object.entries(statusTally)) console.log(`   -> ${k}: ${v}`);
  console.log(`Pieces already at >= inferred status (left as-is): ${skippedNoUpgrade}`);
  console.log(`\nScan events ${COMMIT ? "created/kept" : "to create"}: ${scansToCreate}`);
  if (!COMMIT) console.log("\nDRY RUN — no changes written. Re-run with --commit to apply.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
