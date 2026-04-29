/**
 * Ensure every active Company has at least one Campaign so the new-order
 * flow's "Select campaign" dropdown is never empty for end customers.
 *
 *   npx tsx scripts/ensure-default-campaigns.ts
 *
 * For each active Company without any Campaign, creates a default one named
 * after the company (e.g. "BH Land Group - General"). The campaignCode is
 * derived from the company slug so it sorts well next to AccuZIP filenames.
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { campaigns: true } },
    },
  });

  const needsDefault = companies.filter((c) => c._count.campaigns === 0);
  console.log(`\nActive companies: ${companies.length}`);
  console.log(`Without any campaign: ${needsDefault.length}\n`);

  for (const c of needsDefault) {
    const code = `CD-${new Date().getFullYear()}-${c.slug
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12)}-GEN`;
    const created = await prisma.campaign.create({
      data: {
        companyId: c.id,
        name: `${c.name} — General`,
        campaignCode: code,
        description:
          "Default campaign — orders without a specific campaign land here.",
      },
    });
    console.log(`  ✓ ${c.name}: created "${created.name}" (${code})`);
  }

  if (needsDefault.length === 0) {
    console.log("Nothing to do — every active company already has a campaign.");
  }
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
