/**
 * Enables the "land-investor" persona module on BH Land Group.
 * Idempotent — re-running is safe.
 *
 * Usage: npx tsx scripts/enable-land-module-bhland.ts
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { slug: "bh-land-group" },
        { name: { contains: "BH Land", mode: "insensitive" } },
      ],
    },
  });

  if (!company) {
    console.error("❌ BH Land Group company not found. Create it first.");
    process.exit(1);
  }

  const current = company.enabledModules ?? [];
  if (current.includes("land-investor")) {
    console.log(`✅ Already enabled on ${company.name} (${company.id})`);
    return;
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { enabledModules: [...current, "land-investor"] },
  });

  console.log(`✅ Enabled land-investor module on ${company.name} (${company.id})`);
  console.log(`   Modules now: ${[...current, "land-investor"].join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
