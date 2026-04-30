/**
 * Delete any orders whose orderCode contains 'TEST'. Use after demo'ing the
 * Production Queue.
 *
 *   npx tsx scripts/delete-test-orders.ts
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const tests = await prisma.order.findMany({
    where: { orderCode: { contains: "TEST" } },
    select: { id: true, orderCode: true, status: true },
  });
  console.log(`Found ${tests.length} test orders\n`);
  for (const t of tests) {
    console.log(`  removing ${t.orderCode} (${t.status})`);
  }
  if (tests.length === 0) return;

  // Delete dependents first (handoffs, drawdowns, approvals, proofs)
  await prisma.productionHandoff.deleteMany({
    where: { orderId: { in: tests.map((t) => t.id) } },
  });
  await prisma.order.deleteMany({
    where: { id: { in: tests.map((t) => t.id) } },
  });
  console.log(`\n✓ Deleted ${tests.length} test orders.`);
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
