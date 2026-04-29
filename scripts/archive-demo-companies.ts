/**
 * One-off: archive demo / test companies in MailerCity before Tom starts
 * dropping real customer Mail.dat files.
 *
 *   npx tsx scripts/archive-demo-companies.ts
 *
 * Sets `isActive = false` on the named companies. Doesn't delete data.
 * Reversible by flipping isActive back to true via Prisma Studio or a future
 * "Restore" admin button. Also writes the archive timestamp into the slug
 * (so we don't accidentally collide if a real customer with the same name
 * shows up later — e.g. if there's actually a real Sunshine Realty Group out
 * there one day).
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Exact-match against Company.name. Case-sensitive — confirm spelling first.
const TO_ARCHIVE = [
  "C&D Printing Demo Account",
  "Aaron Waxman RE TEST",
  "Palm Coast Insurance",
  "Sunshine Realty Group",
];

async function main() {
  // Show what's in the DB right now
  const all = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      _count: {
        select: { orders: true, campaigns: true, users: true, mailPieces: true },
      },
    },
    orderBy: { name: "asc" },
  });

  console.log("\n=== All companies (before) ===");
  for (const c of all) {
    const flag = c.isActive ? "✓" : "🗄";
    console.log(
      `  ${flag} ${c.name.padEnd(35)} orders=${c._count.orders} campaigns=${c._count.campaigns} users=${c._count.users} pieces=${c._count.mailPieces}`,
    );
  }

  console.log("\n=== Archiving ===");
  for (const name of TO_ARCHIVE) {
    const company = all.find((c) => c.name === name);
    if (!company) {
      console.log(`  ⚠️  No company named "${name}" — skipping`);
      continue;
    }
    if (!company.isActive) {
      console.log(`  •  "${name}" already archived — skipping`);
      continue;
    }
    // Suffix the slug so a future real customer with the same name doesn't collide
    const archivedSlug = `${company.slug}-archived-${Math.floor(Date.now() / 1000)}`;
    await prisma.company.update({
      where: { id: company.id },
      data: { isActive: false, slug: archivedSlug },
    });
    console.log(`  🗄  Archived "${name}" (id=${company.id})`);
  }

  // Summary
  const after = await prisma.company.findMany({
    select: { name: true, isActive: true },
    orderBy: { name: "asc" },
  });
  console.log("\n=== All companies (after) ===");
  for (const c of after) {
    const flag = c.isActive ? "✓" : "🗄";
    console.log(`  ${flag} ${c.name}`);
  }
  const activeCount = after.filter((c) => c.isActive).length;
  console.log(`\nActive: ${activeCount} · Archived: ${after.length - activeCount}`);
}

main()
  .catch((e) => {
    console.error("✗ Archive failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
