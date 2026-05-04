/**
 * Categorize the 47,631 PENDING pieces by drop date so the dashboard tells
 * the truth instead of one big "47k waiting" lump.
 *
 * Strategy:
 *   1. Parse drop date from each SharepointImport.fileName
 *      Format: "Presort {jobnum}_{customer}_{M.DD}_{count}.zip"
 *   2. For each Order created from that import, set Order.dropDate
 *   3. For each MailPiece in those campaigns/orders without a scan AND
 *      drop date > 30 days ago → set status to EXPIRED_NO_SCAN
 *
 *   npx tsx scripts/categorize-pending.ts            (dry-run)
 *   npx tsx scripts/categorize-pending.ts --commit   (apply)
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const COMMIT = process.argv.includes("--commit");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Today: 2026-05-04
const TODAY = new Date("2026-05-04T00:00:00Z");
const SCAN_WINDOW_DAYS = 30;

/** Parse drop date from "Presort 261370_ACU_5.8_320.zip" → Date(2026-05-08) */
function parseDropDate(fileName: string): Date | null {
  // Match the M.DD or MM.DD pattern between underscores
  const m = fileName.match(/_(\d{1,2})\.(\d{1,2})_/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Guess the year: if month/day is in the future relative to today within
  // the same year, use this year. Otherwise this year. (No December→January
  // edge case for now — these files are all 2026.)
  const year = TODAY.getUTCFullYear();
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  console.log(`\n${COMMIT ? "🔧 COMMITTING" : "🔍 DRY-RUN"}\n`);

  const imports = await prisma.sharepointImport.findMany({
    where: { status: "COMPLETED", createdOrderId: { not: null } },
    select: { id: true, fileName: true, createdOrderId: true, createdCampaignId: true },
  });
  console.log(`SharepointImports with orders: ${imports.length}`);

  const cutoff = new Date(TODAY.getTime() - SCAN_WINDOW_DAYS * 86400e3);
  console.log(`Scan-window cutoff: ${cutoff.toISOString().slice(0, 10)} (drops before this = EXPIRED)`);

  let parsed = 0;
  let unparsed = 0;
  let pastWindow = 0;
  let inWindow = 0;
  let pieceUpdates = 0;
  const samples: { file: string; drop: string; days: number }[] = [];

  for (const imp of imports) {
    const drop = parseDropDate(imp.fileName);
    if (!drop) {
      unparsed++;
      continue;
    }
    parsed++;
    const ageDays = Math.floor((TODAY.getTime() - drop.getTime()) / 86400e3);
    const expired = drop < cutoff;
    if (expired) pastWindow++;
    else inWindow++;
    if (samples.length < 5) {
      samples.push({ file: imp.fileName, drop: drop.toISOString().slice(0, 10), days: ageDays });
    }

    if (COMMIT && imp.createdOrderId) {
      // Set the order's dropDate
      await prisma.order
        .update({
          where: { id: imp.createdOrderId },
          data: { dropDate: drop },
        })
        .catch(() => {});
    }

    // For every PENDING piece in this campaign that has no scan: bucket it
    if (imp.createdCampaignId) {
      const targetStatus = expired ? "EXPIRED_NO_SCAN" : null;
      if (targetStatus && COMMIT) {
        const r = await prisma.mailPiece.updateMany({
          where: {
            campaignId: imp.createdCampaignId,
            status: "PENDING",
            firstScanAt: null,
          },
          data: { status: targetStatus },
        });
        pieceUpdates += r.count;
      } else if (targetStatus) {
        const c = await prisma.mailPiece.count({
          where: {
            campaignId: imp.createdCampaignId,
            status: "PENDING",
            firstScanAt: null,
          },
        });
        pieceUpdates += c;
      }
    }
  }

  console.log(`\nParsed:    ${parsed}`);
  console.log(`Unparsed:  ${unparsed}`);
  console.log(`Past window (>30d):  ${pastWindow}`);
  console.log(`In window (<=30d):   ${inWindow}`);
  console.log(`\nPieces ${COMMIT ? "moved to" : "would move to"} EXPIRED_NO_SCAN: ${pieceUpdates.toLocaleString()}`);

  if (samples.length) {
    console.log(`\nSample drop dates parsed:`);
    for (const s of samples) console.log(`   ${s.file.padEnd(50)} → ${s.drop} (${s.days}d ago)`);
  }

  // Final distribution
  const dist = await prisma.$queryRawUnsafe<{ s: string; count: bigint }[]>(
    `SELECT status::text as s, COUNT(*)::bigint as count FROM "MailPiece" GROUP BY status ORDER BY count DESC`,
  );
  console.log(`\nMailPiece distribution${COMMIT ? " (after update)" : " (current)"}:`);
  for (const r of dist) console.log(`   ${r.s}: ${Number(r.count).toLocaleString()}`);

  if (!COMMIT) console.log("\nRun with --commit to apply.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
