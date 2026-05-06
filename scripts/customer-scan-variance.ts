/**
 * Why are scan rates so different across customers?
 * Pinellas: 85%, MGE: 18%, Morton: 1%, Achieva: 0%, Dock: 0%
 * Look at STID, MID, drop date age, and scan distribution per customer.
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const cutoff = new Date(); // today

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  for (const c of companies) {
    const [activePieces, scanned, delivered, stids, batches] = await Promise.all([
      prisma.mailPiece.count({
        where: { companyId: c.id, status: { not: "EXPIRED_NO_SCAN" } },
      }),
      prisma.mailPiece.count({
        where: {
          companyId: c.id,
          status: { notIn: ["PENDING", "EXPIRED_NO_SCAN"] },
        },
      }),
      prisma.mailPiece.count({
        where: {
          companyId: c.id,
          status: { in: ["DELIVERED", "DELIVERED_INFERRED"] },
        },
      }),
      prisma.$queryRaw<{ stid: string; count: bigint }[]>`
        SELECT "imbServiceType" as stid, COUNT(*)::bigint as count
          FROM "MailPiece"
         WHERE "companyId" = ${c.id} AND status != 'EXPIRED_NO_SCAN'
         GROUP BY "imbServiceType" ORDER BY count DESC LIMIT 5`,
      prisma.mailBatch.findMany({
        where: {
          campaign: { companyId: c.id },
          dropDate: { gte: new Date(Date.now() - 35 * 86400e3) },
        },
        select: { batchName: true, dropDate: true, quantity: true },
        orderBy: { dropDate: "desc" },
        take: 5,
      }),
    ]);
    if (activePieces === 0) continue;
    const scanPct = ((scanned / activePieces) * 100).toFixed(1);
    const deliveredPct = ((delivered / activePieces) * 100).toFixed(1);
    console.log(`\n━━━ ${c.name} ━━━`);
    console.log(
      `  active=${activePieces.toLocaleString()}  scanned=${scanned.toLocaleString()} (${scanPct}%)  delivered=${delivered.toLocaleString()} (${deliveredPct}%)`,
    );
    console.log(`  STIDs: ${stids.map((s) => `${s.stid}=${Number(s.count)}`).join(", ")}`);
    if (batches.length) {
      console.log(`  Recent drops:`);
      for (const b of batches) {
        const days = Math.floor((cutoff.getTime() - b.dropDate.getTime()) / 86400e3);
        console.log(
          `     ${b.dropDate.toISOString().slice(0, 10)} (${days}d ago)  ${b.batchName}  qty=${b.quantity?.toLocaleString() ?? "-"}`,
        );
      }
    } else {
      console.log(`  Recent drops: (no MailBatch records — drops not registered)`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
