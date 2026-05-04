import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const recent = await prisma.iVFeedIngestion.findMany({
    orderBy: { startedAt: "desc" },
    take: 3,
    where: { recordsReceived: { gt: 100 } },
  });
  for (const r of recent) {
    console.log("\n═══════════════════════════════════════");
    console.log("startedAt:    ", r.startedAt.toISOString());
    console.log("status:       ", r.status);
    console.log("received:     ", r.recordsReceived);
    console.log("inserted:     ", r.recordsInserted);
    console.log("skipped:      ", r.recordsSkipped);
    console.log("errorMessage:");
    console.log(r.errorMessage ?? "(null)");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
