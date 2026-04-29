/**
 * One-off: create a test CUSTOMER login under BH Land Group so Benjy can
 * preview Aaron's customer view without burning Aaron's invite token.
 *
 *   npx tsx scripts/create-bhland-test-login.ts
 *
 * Aaron's real invite stays untouched. Aaron will accept normally and his
 * own login is independent of this test user.
 */

import { config } from "dotenv";
config();

import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TEST_EMAIL = "bhland-test@cndprinting.com";
const TEST_PASSWORD = "BHLand!Demo2026";
const TEST_NAME = "BH Land (Demo)";

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: "BH Land Group", isActive: true },
  });
  if (!company) {
    throw new Error("Company 'BH Land Group' not found or archived. Restore it first.");
  }

  const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  const passwordHash = await hash(TEST_PASSWORD, 10);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, companyId: company.id, role: "CUSTOMER", name: TEST_NAME },
    });
    console.log(`✓ Updated existing test user (id=${existing.id})`);
  } else {
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: TEST_NAME,
        passwordHash,
        role: "CUSTOMER",
        companyId: company.id,
      },
    });
    console.log(`✓ Created test user (id=${user.id})`);
  }

  console.log("\n─────────────────────────────────────────────");
  console.log("BH Land Group — TEST CUSTOMER LOGIN");
  console.log("─────────────────────────────────────────────");
  console.log(`  URL:      https://marketing.cndprinting.com/login`);
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  Role:     CUSTOMER`);
  console.log(`  Company:  ${company.name}`);
  console.log("─────────────────────────────────────────────");
  console.log("Use this in incognito to preview Aaron's customer view.");
  console.log("Aaron's real invite (aaron@bhlandgroup.co) is untouched.");
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
