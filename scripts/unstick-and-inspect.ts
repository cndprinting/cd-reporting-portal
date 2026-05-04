/**
 * Mark every stuck PROCESSING IVFeedIngestion as FAILED so they stop polluting
 * the dashboard, and print the raw payload preview from one (so we can see
 * what USPS is actually sending).
 *
 * Run: npx tsx scripts/unstick-and-inspect.ts
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // Find stuck pushes
  const stuck = await prisma.iVFeedIngestion.findMany({
    where: { status: "PROCESSING" },
    orderBy: { startedAt: "desc" },
  });
  console.log(`Found ${stuck.length} stuck ingestions in PROCESSING.\n`);

  // Show recent ones with errorMessage (which now contains raw sample)
  const recent = await prisma.iVFeedIngestion.findFirst({
    orderBy: { startedAt: "desc" },
    where: { errorMessage: { contains: "RAW_SAMPLE" } },
  });
  if (recent) {
    console.log("Most recent ingestion with raw sample captured:");
    console.log("  startedAt:", recent.startedAt);
    console.log("  status:   ", recent.status);
    console.log("  received: ", recent.recordsReceived);
    console.log("  raw sample:");
    console.log("  " + (recent.errorMessage ?? "").slice(0, 2000));
    console.log();
  } else {
    console.log("No ingestions yet have a raw payload sample (deploy the fix first, then check back).\n");
  }

  if (stuck.length > 0) {
    const result = await prisma.iVFeedIngestion.updateMany({
      where: { status: "PROCESSING" },
      data: {
        status: "FAILED",
        errorMessage: "Stuck in PROCESSING — old code path silently died. Reset by unstick script.",
        completedAt: new Date(),
      },
    });
    console.log(`✓ Marked ${result.count} stuck ingestions as FAILED.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
