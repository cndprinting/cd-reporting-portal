import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const since = new Date(Date.now() - 60 * 60 * 1000); // last hour
  const ingestions = await prisma.iVFeedIngestion.findMany({
    where: { startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
    take: 30,
  });

  console.log(`\n▸ IV-MTR ingestions in the last hour: ${ingestions.length}`);
  for (const i of ingestions) {
    const ageMin = Math.floor((Date.now() - i.startedAt.getTime()) / 60000);
    console.log(
      `   ${i.startedAt.toISOString().slice(11, 16)} (${ageMin}m ago)  ` +
      `received=${i.recordsReceived.toString().padStart(4)}  ` +
      `inserted=${i.recordsInserted.toString().padStart(4)}  ` +
      `skipped=${i.recordsSkipped.toString().padStart(4)}  ` +
      `status=${i.status}`,
    );
  }

  // Show error message of most recent one
  if (ingestions.length > 0) {
    const latest = ingestions[0];
    console.log(`\n▸ Latest ingestion errorMessage (first 500 chars):`);
    console.log(`   ${(latest.errorMessage ?? "(none)").slice(0, 500)}`);
  }

  // Stats
  const totalScans = await prisma.scanEvent.count();
  const recentScans = await prisma.scanEvent.count({
    where: { scanDatetime: { gte: since } },
  });
  const totalOrphans = await prisma.unknownImb.count();
  console.log(`\n▸ DB state:`);
  console.log(`   Total ScanEvents: ${totalScans.toLocaleString()}`);
  console.log(`   Scans in last hour: ${recentScans.toLocaleString()}`);
  console.log(`   Orphan UnknownImbs: ${totalOrphans.toLocaleString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
