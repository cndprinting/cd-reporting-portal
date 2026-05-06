/**
 * Archive everything that dropped on or before April 30, 2026.
 * Fresh start: only May 5+ mailings stay active in operational dashboards.
 *
 * Strategy: any MailPiece whose linked MailBatch.dropDate <= 2026-04-30
 * gets status moved to EXPIRED_NO_SCAN. Pieces without a batch link
 * fall back to checking createdAt < 2026-05-01 (since Tom's bulk imports
 * happened Apr 30 and earlier).
 *
 *   npx tsx scripts/archive-pre-may.ts            (dry-run)
 *   npx tsx scripts/archive-pre-may.ts --commit   (apply)
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const COMMIT = process.argv.includes("--commit");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const CUTOFF = new Date("2026-05-01T00:00:00Z");

async function main() {
  console.log(`\n${COMMIT ? "🔧 ARCHIVING" : "🔍 DRY-RUN"}`);
  console.log(`Anything dropped or imported before ${CUTOFF.toISOString().slice(0, 10)} → EXPIRED_NO_SCAN.\n`);

  // Pieces with a MailBatch whose dropDate <= cutoff
  const byBatch = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count
       FROM "MailPiece" mp
       JOIN "MailBatch" b ON b.id = mp."mailBatchId"
      WHERE b."dropDate" < $1
        AND mp.status != 'EXPIRED_NO_SCAN'`,
    CUTOFF,
  );
  // Pieces with no batch link, but imported before cutoff
  const byCreated = await prisma.mailPiece.count({
    where: {
      mailBatchId: null,
      createdAt: { lt: CUTOFF },
      status: { not: "EXPIRED_NO_SCAN" },
    },
  });

  const willArchive = Number(byBatch[0].count) + byCreated;
  console.log(`  Pieces with batch.dropDate < ${CUTOFF.toISOString().slice(0, 10)}: ${Number(byBatch[0].count).toLocaleString()}`);
  console.log(`  Pieces with no batch + createdAt < cutoff: ${byCreated.toLocaleString()}`);
  console.log(`  Total to archive: ${willArchive.toLocaleString()}`);

  if (!COMMIT) {
    console.log("\nRun with --commit to apply.");
    return;
  }

  // Apply via two updateMany calls
  const r1 = await prisma.$executeRawUnsafe(
    `UPDATE "MailPiece"
        SET status = 'EXPIRED_NO_SCAN'::"MailPieceStatus"
      WHERE "mailBatchId" IN (
        SELECT id FROM "MailBatch" WHERE "dropDate" < $1
      )
      AND status != 'EXPIRED_NO_SCAN'`,
    CUTOFF,
  );
  const r2 = await prisma.mailPiece.updateMany({
    where: {
      mailBatchId: null,
      createdAt: { lt: CUTOFF },
      status: { not: "EXPIRED_NO_SCAN" },
    },
    data: { status: "EXPIRED_NO_SCAN" },
  });

  console.log(`\n✅ Archived: ${(r1 + r2.count).toLocaleString()} pieces`);

  // Final state
  const dist = await prisma.$queryRawUnsafe<{ s: string; count: bigint }[]>(
    `SELECT status::text as s, COUNT(*)::bigint as count FROM "MailPiece" GROUP BY status ORDER BY count DESC`,
  );
  console.log(`\nFinal MailPiece distribution:`);
  for (const r of dist) console.log(`   ${r.s}: ${Number(r.count).toLocaleString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
