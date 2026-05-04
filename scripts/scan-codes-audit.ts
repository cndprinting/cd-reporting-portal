import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const codes = await prisma.$queryRawUnsafe<{ code: string; desc: string; count: bigint }[]>(
    `SELECT "operationCode" as code, "operationDesc" as desc, COUNT(*)::bigint as count
       FROM "ScanEvent"
      GROUP BY "operationCode", "operationDesc"
      ORDER BY count DESC LIMIT 30`,
  );
  console.log("\n▸ Distinct scan codes USPS is actually sending:");
  for (const c of codes) {
    console.log(`   code=${(c.code ?? "(null)").padEnd(6)} desc=${(c.desc ?? "").padEnd(30)} count=${Number(c.count).toLocaleString()}`);
  }

  const ops = await prisma.$queryRawUnsafe<{ op: string; count: bigint }[]>(
    `SELECT operation::text as op, COUNT(*)::bigint as count FROM "ScanEvent" GROUP BY operation ORDER BY count DESC`,
  );
  console.log("\n▸ Mapped operations:");
  for (const o of ops) console.log(`   ${o.op}: ${Number(o.count).toLocaleString()}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
