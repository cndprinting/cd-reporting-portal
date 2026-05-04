/**
 * Why are 1,396 scans orphaned (no matching MailPiece)?
 * Group orphans by their 20-digit prefix and BC+STID, see if any pattern
 * matches data we should have but don't.
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // 1. Distribution of orphan IMbs by BC+STID
  console.log("\n▸ Orphan IMb prefixes (BC+STID):");
  const groups = await prisma.$queryRawUnsafe<{ prefix: string; count: bigint }[]>(
    `SELECT SUBSTRING(imb, 1, 5) as prefix, COUNT(*)::bigint as count
       FROM "UnknownImb"
      GROUP BY SUBSTRING(imb, 1, 5)
      ORDER BY count DESC LIMIT 20`,
  );
  for (const g of groups) {
    console.log(`   ${g.prefix} (BC=${g.prefix.slice(0, 2)} STID=${g.prefix.slice(2)}): ${Number(g.count).toLocaleString()}`);
  }

  // 2. Distribution of orphan MIDs (positions 5-13 for 9-digit MID)
  console.log("\n▸ Orphan IMb MIDs (positions 6-14, 9-digit assumption):");
  const mids = await prisma.$queryRawUnsafe<{ mid: string; count: bigint }[]>(
    `SELECT SUBSTRING(imb, 6, 9) as mid, COUNT(*)::bigint as count
       FROM "UnknownImb"
      GROUP BY SUBSTRING(imb, 6, 9)
      ORDER BY count DESC LIMIT 10`,
  );
  for (const m of mids) {
    console.log(`   MID=${m.mid}: ${Number(m.count).toLocaleString()}`);
  }

  // 3. For a sample of orphans, try to find a stored piece with same BC+STID+MID prefix
  console.log("\n▸ Spot-check: do any orphans share their MID portion with stored pieces?");
  const sampleOrphans = await prisma.unknownImb.findMany({ take: 5 });
  for (const o of sampleOrphans) {
    const orphanMid = o.imb.slice(5, 14); // 9-digit MID at positions 5-13
    const orphan20 = o.imb.slice(0, 20);
    const matchByMid = await prisma.mailPiece.count({
      where: { imb: { contains: orphanMid } },
    });
    const matchByPrefix = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint as count FROM "MailPiece" WHERE substring(imb, 1, 20) = $1`,
      orphan20,
    );
    console.log(`   orphan ${o.imb}`);
    console.log(`     20-prefix=${orphan20}  exact-prefix-match=${Number(matchByPrefix[0].count)}`);
    console.log(`     MID=${orphanMid}  any-piece-with-MID=${matchByMid}`);
  }

  // 4. What MIDs do our stored MailPieces have post-backfill?
  console.log("\n▸ Stored MailPiece MIDs after backfill (top 10):");
  const storedMids = await prisma.$queryRawUnsafe<{ mid: string; count: bigint }[]>(
    `SELECT "imbMailerId" as mid, COUNT(*)::bigint as count
       FROM "MailPiece"
      GROUP BY "imbMailerId"
      ORDER BY count DESC LIMIT 10`,
  );
  for (const m of storedMids) {
    console.log(`   MID=${m.mid}: ${Number(m.count).toLocaleString()}`);
  }

  // 5. STID breakdown of stored pieces
  console.log("\n▸ Stored MailPiece STIDs:");
  const stids = await prisma.$queryRawUnsafe<{ stid: string; count: bigint }[]>(
    `SELECT "imbServiceType" as stid, COUNT(*)::bigint as count
       FROM "MailPiece"
      GROUP BY "imbServiceType"
      ORDER BY count DESC`,
  );
  for (const s of stids) {
    console.log(`   STID=${s.stid}: ${Number(s.count).toLocaleString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
