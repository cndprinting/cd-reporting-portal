/**
 * Grounding diagnostic for the reassessment + Option A backfill.
 * Read-only. Prints the real current state of Aaron's order, his stored
 * pieces, scan matches, and how many orphan IMbs now match his pieces by
 * 20-digit prefix.
 */
import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderCode: { contains: "BHLANDGR" } },
    include: { campaign: true },
  });
  if (!order) {
    console.log("No BHLANDGR order found");
    return;
  }
  console.log("▸ ORDER", order.orderCode, "status=", order.status);
  console.log("   campaignId=", order.campaignId, "name=", order.campaign?.name, "code=", order.campaign?.campaignCode);

  const campaignId = order.campaignId;

  const pieceCount = await prisma.mailPiece.count({ where: { campaignId } });
  const byStatus = await prisma.mailPiece.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  });
  console.log("\n▸ STORED PIECES for campaign:", pieceCount);
  for (const s of byStatus) console.log(`   ${s.status}: ${s._count}`);

  const scanCount = await prisma.scanEvent.count({
    where: { mailPiece: { campaignId } },
  });
  console.log("\n▸ SCAN EVENTS attached to those pieces:", scanCount);

  const orphanTotal = await prisma.unknownImb.count();
  const orphanUnresolved = await prisma.unknownImb.count({ where: { isResolved: false } });
  console.log("\n▸ ORPHANS total:", orphanTotal, "unresolved:", orphanUnresolved);

  // How many orphans match a stored piece in THIS campaign by 20-digit prefix?
  const matchRows = await prisma.$queryRawUnsafe<{ count: bigint; occ: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count, COALESCE(SUM(u.occurrences),0)::bigint AS occ
       FROM "UnknownImb" u
       JOIN "MailPiece" m
         ON substring(m.imb,1,20) = substring(u.imb,1,20)
      WHERE m."campaignId" = $1`,
    campaignId,
  );
  console.log("\n▸ ORPHANS matching this campaign's pieces (20-digit prefix):");
  console.log("   distinct orphan IMbs:", Number(matchRows[0].count));
  console.log("   total scan occurrences they represent:", Number(matchRows[0].occ));

  // sampleOperation distribution among those matching orphans
  const opRows = await prisma.$queryRawUnsafe<{ op: string | null; count: bigint }[]>(
    `SELECT u."sampleOperation" AS op, COUNT(*)::bigint AS count
       FROM "UnknownImb" u
       JOIN "MailPiece" m
         ON substring(m.imb,1,20) = substring(u.imb,1,20)
      WHERE m."campaignId" = $1
      GROUP BY u."sampleOperation"
      ORDER BY count DESC`,
    campaignId,
  );
  console.log("\n▸ sampleOperation distribution of matching orphans:");
  for (const r of opRows) console.log(`   ${r.op ?? "(null)"}: ${Number(r.count)}`);

  // lastSeen range
  const range = await prisma.$queryRawUnsafe<{ minf: Date; maxf: Date; minl: Date; maxl: Date }[]>(
    `SELECT MIN(u."firstSeenAt") minf, MAX(u."firstSeenAt") maxf,
            MIN(u."lastSeenAt") minl, MAX(u."lastSeenAt") maxl
       FROM "UnknownImb" u
       JOIN "MailPiece" m
         ON substring(m.imb,1,20) = substring(u.imb,1,20)
      WHERE m."campaignId" = $1`,
    campaignId,
  );
  console.log("\n▸ matching orphan firstSeen/lastSeen range:");
  console.log("   firstSeen:", range[0].minf, "→", range[0].maxf);
  console.log("   lastSeen :", range[0].minl, "→", range[0].maxl);
}

main().catch(console.error).finally(() => prisma.$disconnect());
