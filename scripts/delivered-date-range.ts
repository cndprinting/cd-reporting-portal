/**
 * What drop date range is actually producing DELIVERED scans?
 * Helps Benjy understand which mailings the tracking is working on
 * (the current cohort) vs which never produced delivery data.
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // Per-customer drop-date health
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Drop dates that ARE producing scans + deliveries");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (const c of companies) {
    const batches = await prisma.mailBatch.findMany({
      where: {
        campaign: { companyId: c.id },
        dropDate: { gte: new Date("2026-04-01") },
      },
      select: { id: true, batchName: true, dropDate: true, quantity: true, campaignId: true },
      orderBy: { dropDate: "desc" },
    });
    if (batches.length === 0) continue;

    console.log(`\n${c.name}`);
    console.log("─".repeat(80));

    for (const b of batches) {
      const ageDays = Math.floor((Date.now() - b.dropDate.getTime()) / 86400e3);
      const total = await prisma.mailPiece.count({
        where: { campaignId: b.campaignId, status: { not: "EXPIRED_NO_SCAN" } },
      });
      const scanned = await prisma.mailPiece.count({
        where: {
          campaignId: b.campaignId,
          status: { notIn: ["PENDING", "EXPIRED_NO_SCAN"] },
        },
      });
      const delivered = await prisma.mailPiece.count({
        where: {
          campaignId: b.campaignId,
          status: { in: ["DELIVERED", "DELIVERED_INFERRED"] },
        },
      });
      if (total === 0) continue;

      const scanPct = ((scanned / total) * 100).toFixed(0);
      const delPct = ((delivered / total) * 100).toFixed(0);
      const flag =
        delivered > 0 ? "✅" : scanned > 0 ? "🟡" : ageDays > 2 ? "🔴" : "⏳";
      console.log(
        `  ${flag} ${b.dropDate.toISOString().slice(0, 10)} (${ageDays}d ago)  ${b.batchName.padEnd(45)}  qty=${b.quantity?.toString().padStart(5)}  scanned=${scanPct.padStart(3)}%  delivered=${delPct.padStart(3)}%`,
      );
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Aggregate: drop date distribution of DELIVERED pieces");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const deliveredByDate = await prisma.$queryRawUnsafe<{ d: Date; count: bigint }[]>(
    `SELECT DATE(b."dropDate") as d, COUNT(mp.id)::bigint as count
       FROM "MailPiece" mp
       JOIN "MailBatch" b ON b.id = mp."mailBatchId"
      WHERE mp.status IN ('DELIVERED','DELIVERED_INFERRED')
      GROUP BY DATE(b."dropDate")
      ORDER BY d DESC`,
  );
  if (deliveredByDate.length === 0) {
    console.log("  No deliveries with linked drop date yet.");
  } else {
    for (const r of deliveredByDate) {
      console.log(`  drop ${r.d.toISOString().slice(0, 10)}: ${Number(r.count).toLocaleString()} delivered`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
