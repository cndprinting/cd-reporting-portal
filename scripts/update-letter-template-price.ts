/**
 * One-off: update the letter-class template price to $0.65/piece
 * ($0.22 production + $0.43 First-Class postage = $0.65 total).
 *
 *   npx tsx scripts/update-letter-template-price.ts
 *
 * Per Benjy 2026-04-29: this is the right price for letter mailings under
 * current C&D rates. Other customers may have negotiated different rates —
 * future iteration will support per-customer pricing.
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // Find any template that's a "letter" category
  const templates = await prisma.mailerTemplate.findMany({
    where: { category: "letter" },
  });
  console.log(`Found ${templates.length} letter templates`);
  for (const t of templates) {
    await prisma.mailerTemplate.update({
      where: { id: t.id },
      data: { pricePerPiece: 0.65 },
    });
    console.log(
      `  ✓ ${t.name} (${t.size}): $${t.pricePerPiece} → $0.65`,
    );
  }
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
