/**
 * Are all customers' serial ranges covered by our IV-MTR subscription?
 *
 * If Dock Builders' serials don't appear in any orphan UnknownImb scans,
 * USPS isn't pushing them to us → subscription scope issue.
 * If they DO appear in orphans → USPS is pushing, our matching is broken.
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const targets = ["Pinellas Education Foundation", "MGE", "Morton Plant", "Dock Builders", "Achieva"];

  for (const name of targets) {
    const co = await prisma.company.findFirst({ where: { name } });
    if (!co) continue;

    // Pull serial range
    const rows = await prisma.$queryRaw<{ minSerial: string; maxSerial: string; cnt: bigint }[]>`
      SELECT MIN("imbSerial") as "minSerial", MAX("imbSerial") as "maxSerial", COUNT(*)::bigint as cnt
        FROM "MailPiece"
       WHERE "companyId" = ${co.id} AND status != 'EXPIRED_NO_SCAN'
    `;
    const { minSerial, maxSerial, cnt } = rows[0];

    if (!minSerial) continue;

    // Sample first 2 stored IMbs (the 20-digit prefix is what USPS would push)
    const samples = await prisma.mailPiece.findMany({
      where: { companyId: co.id, status: { not: "EXPIRED_NO_SCAN" } },
      take: 2,
      select: { imb: true, imbSerial: true, firstScanAt: true },
    });

    // For each sample's 20-digit prefix, check whether ANY orphan starts with it
    const orphanMatches = await Promise.all(
      samples.map(async (s) => {
        const prefix20 = s.imb.slice(0, 20);
        const orphan = await prisma.unknownImb.findFirst({
          where: { imb: { startsWith: prefix20 } },
        });
        return { sampleImb: s.imb, prefix20, orphanFound: !!orphan, orphanImb: orphan?.imb };
      }),
    );

    // Also: how many of THIS customer's scanned pieces have actually scanned?
    const scannedCount = await prisma.mailPiece.count({
      where: {
        companyId: co.id,
        status: { notIn: ["PENDING", "EXPIRED_NO_SCAN"] },
      },
    });

    console.log(`\n━━━ ${co.name} ━━━`);
    console.log(`  pieces=${Number(cnt).toLocaleString()}  scanned=${scannedCount.toLocaleString()}  serials=${minSerial} → ${maxSerial}`);
    for (const m of orphanMatches) {
      console.log(`    sample serial in this batch: ${m.sampleImb.slice(14, 20)}`);
      console.log(`      stored MailPiece scanned: ${samples.find((s) => s.imb === m.sampleImb)?.firstScanAt ? "yes ✓" : "no"}`);
      console.log(
        `      USPS pushing for this prefix? ${m.orphanFound ? "yes (orphan exists, matching broken?)" : "NO orphan found — USPS not pushing this serial range, OR they perfectly match stored pieces"}`,
      );
    }
  }

  // Direct check: for low-scan customers, are there ANY orphan UnknownImbs
  // whose first 20 chars match THEIR specific 20-digit prefix space?
  console.log("\n━━━ Cross-check: orphans by 14-char prefix (BC+STID+MID+first 6 of serial) ━━━");
  const customersToCheck = ["Dock Builders", "Morton Plant"];
  for (const name of customersToCheck) {
    const co = await prisma.company.findFirst({ where: { name } });
    if (!co) continue;
    // Get distinct 14-char prefixes of this customer's stored IMbs
    const prefixes = await prisma.$queryRaw<{ p: string }[]>`
      SELECT DISTINCT SUBSTRING(imb, 1, 14) as p
        FROM "MailPiece"
       WHERE "companyId" = ${co.id} AND status != 'EXPIRED_NO_SCAN'
       LIMIT 5
    `;
    console.log(`\n  ${name}: ${prefixes.length} distinct 14-char prefix${prefixes.length === 1 ? "" : "es"}`);
    for (const { p } of prefixes) {
      const orphans = await prisma.unknownImb.count({ where: { imb: { startsWith: p } } });
      console.log(`     prefix ${p}: ${orphans} orphan scan${orphans === 1 ? "" : "s"} pushed for this prefix range`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
