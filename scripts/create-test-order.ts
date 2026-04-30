/**
 * Create a fake test order under BH Land Group so the Production Queue
 * has at least one row to demo the Send button.
 *
 *   npx tsx scripts/create-test-order.ts
 *
 * Run scripts/delete-test-orders.ts to clean up.
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
    where: { name: "BH Land Group", isActive: true },
  });
  if (!company) throw new Error("BH Land Group not found / inactive");

  const campaign = await prisma.campaign.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: "asc" },
  });
  if (!campaign) throw new Error("No campaign for BH Land Group");

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (!admin) throw new Error("No admin user");

  const drop = new Date();
  drop.setDate(drop.getDate() + 14);

  const order = await prisma.order.create({
    data: {
      orderCode: `CD-2026-BHLAND-TEST${Math.floor(Date.now() / 1000) % 1000}`,
      companyId: company.id,
      campaignId: campaign.id,
      description: "TEST — fake order to demo the Production Queue Send button",
      quantity: 250,
      dropDate: drop,
      mailClass: "Marketing Mail",
      mailShape: "letter",
      pricePerPiece: 0.65,
      totalPrice: 162.5,
      status: "DRAFT",
      createdBy: admin.id,
      // The key field — order needs a list URL to show in the queue
      mailingListUrl:
        "https://marketing.cndprinting.com/api/templates/recipient-list.csv",
      mailingListFileName: "TEST-recipient-list.csv",
      mailingListUploadedAt: new Date(),
      mailingListRowCount: 250,
    },
  });

  console.log("\n─────────────────────────────────────────────");
  console.log(`✓ Test order created`);
  console.log(`  Order code: ${order.orderCode}`);
  console.log(`  ID:         ${order.id}`);
  console.log(`  Customer:   BH Land Group`);
  console.log(`  Status:     DRAFT (will appear in Production Queue)`);
  console.log("─────────────────────────────────────────────");
  console.log(
    `View: https://marketing.cndprinting.com/dashboard/admin/production-queue`,
  );
  console.log(`Delete with: npx tsx scripts/delete-test-orders.ts`);
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
