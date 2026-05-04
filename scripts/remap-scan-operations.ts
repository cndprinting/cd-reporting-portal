/**
 * Remap existing ScanEvent.operation values using the updated mapOperationCode().
 * Then re-rollup MailPiece statuses based on the corrected operations.
 */
import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { mapOperationCode } from "../src/lib/services/imb";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const events = await prisma.scanEvent.findMany({
    select: { id: true, operationCode: true, operation: true, mailPieceId: true },
  });
  console.log(`Found ${events.length} scan events to remap`);

  let updated = 0;
  const affectedPieces = new Set<string>();
  for (const e of events) {
    const newOp = mapOperationCode(e.operationCode) as
      | "ORIGIN_ACCEPTANCE"
      | "ORIGIN_PROCESSED"
      | "IN_TRANSIT"
      | "DESTINATION_PROCESSED"
      | "DESTINATION_DELIVERY"
      | "OUT_FOR_DELIVERY"
      | "DELIVERED"
      | "UNDELIVERABLE"
      | "OTHER";
    if (newOp !== e.operation) {
      await prisma.scanEvent.update({ where: { id: e.id }, data: { operation: newOp } });
      updated++;
      affectedPieces.add(e.mailPieceId);
    }
  }
  console.log(`Updated ${updated} events. Re-rolling up ${affectedPieces.size} pieces…`);

  // Re-compute MailPiece status
  const { rollupMailPieceStatus } = await import("../src/lib/services/iv-mtr-ingest");
  let rolled = 0;
  for (const pid of affectedPieces) {
    await rollupMailPieceStatus(pid).catch(() => {});
    rolled++;
    if (rolled % 100 === 0) console.log(`  rolled=${rolled}/${affectedPieces.size}`);
  }
  console.log(`Done. ${rolled} pieces re-rolled.`);

  // Show new distribution
  const ops = await prisma.$queryRawUnsafe<{ op: string; count: bigint }[]>(
    `SELECT operation::text as op, COUNT(*)::bigint as count FROM "ScanEvent" GROUP BY operation ORDER BY count DESC`,
  );
  console.log("\nNew operation distribution:");
  for (const o of ops) console.log(`   ${o.op}: ${Number(o.count).toLocaleString()}`);

  const statuses = await prisma.$queryRawUnsafe<{ s: string; count: bigint }[]>(
    `SELECT status::text as s, COUNT(*)::bigint as count FROM "MailPiece" GROUP BY status ORDER BY count DESC`,
  );
  console.log("\nNew MailPiece status distribution:");
  for (const s of statuses) console.log(`   ${s.s}: ${Number(s.count).toLocaleString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
