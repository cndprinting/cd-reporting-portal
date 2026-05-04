/**
 * Audit the IMb format of imported MailPieces vs what USPS is actually
 * pushing. Helps diagnose MID mismatches.
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // Distinct MIDs in our stored MailPieces
  const mids = await prisma.$queryRawUnsafe<{ mid: string; count: bigint }[]>(
    `SELECT "imbMailerId" as mid, COUNT(*)::bigint as count
       FROM "MailPiece"
      GROUP BY "imbMailerId"
      ORDER BY count DESC`,
  );
  console.log("\n▸ Stored MailPiece MIDs:");
  for (const m of mids) {
    console.log(`   MID=${m.mid ?? "(null)"}  count=${Number(m.count).toLocaleString()}`);
  }

  // Distinct BC + STID prefixes
  const prefixes = await prisma.$queryRawUnsafe<{ prefix: string; count: bigint }[]>(
    `SELECT SUBSTRING(imb, 1, 5) as prefix, COUNT(*)::bigint as count
       FROM "MailPiece"
      GROUP BY SUBSTRING(imb, 1, 5)
      ORDER BY count DESC`,
  );
  console.log("\n▸ Stored MailPiece BC+STID prefixes:");
  for (const p of prefixes) {
    console.log(`   prefix=${p.prefix}  (BC=${p.prefix?.slice(0, 2)} STID=${p.prefix?.slice(2)})  count=${Number(p.count).toLocaleString()}`);
  }

  // IMb length distribution
  const lengths = await prisma.$queryRawUnsafe<{ len: number; count: bigint }[]>(
    `SELECT LENGTH(imb) as len, COUNT(*)::bigint as count
       FROM "MailPiece"
      GROUP BY LENGTH(imb)
      ORDER BY len`,
  );
  console.log("\n▸ Stored IMb lengths:");
  for (const l of lengths) {
    console.log(`   ${l.len} digits: ${Number(l.count).toLocaleString()}`);
  }

  // Sample 3 IMbs from each MID
  console.log("\n▸ Sample IMbs per MID:");
  for (const m of mids) {
    if (!m.mid) continue;
    const samples = await prisma.mailPiece.findMany({
      where: { imbMailerId: m.mid },
      take: 3,
      select: { imb: true, recipientName: true, zip5: true, companyId: true, company: { select: { name: true } } },
    });
    console.log(`\n   MID ${m.mid}:`);
    for (const s of samples) {
      console.log(`     ${s.imb}  ${(s.company?.name ?? "").padEnd(28)}  zip=${s.zip5 ?? "-"}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
