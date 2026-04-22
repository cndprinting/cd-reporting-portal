/**
 * One-off onboarding for Aaron Waxman / BH Land Group.
 *
 *   npx tsx scripts/onboard-bhland.ts
 *
 * Creates:
 *   - Company: BH Land Group
 *   - InviteToken for aaron@bhlandgroup.co (CUSTOMER role, tied to the company)
 *
 * Prints the invite link to stdout. Safe to re-run: it looks up by slug/email
 * and only creates what's missing.
 *
 * NOT committed to be run in CI. Delete after use if you want.
 */

import { randomBytes } from "crypto";
import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const COMPANY = {
  name: "BH Land Group",
  slug: "bh-land-group",
  website: "https://bhlandgroup.co",
  address: "1985 W Henderson Rd PMB 62339, Columbus, OH 43220",
  phone: "(205) 964-7875",
  industry: "Land Investment / Real Estate",
};

const USER = {
  email: "aaron@bhlandgroup.co",
  name: "Aaron Waxman",
};

const PORTAL_URL = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
const INVITE_TTL_DAYS = 14;

async function main() {
  // 1. Upsert company
  let company = await prisma.company.findUnique({ where: { slug: COMPANY.slug } });
  if (!company) {
    company = await prisma.company.create({ data: COMPANY });
    console.log(`✓ Created Company: ${company.name} (id=${company.id})`);
  } else {
    console.log(`• Company already exists: ${company.name} (id=${company.id})`);
  }

  // 2. Check if user already exists (invite not needed then)
  const existingUser = await prisma.user.findUnique({ where: { email: USER.email } });
  if (existingUser) {
    console.log(
      `• User already exists: ${existingUser.email} (id=${existingUser.id}) — no invite needed`,
    );
    return;
  }

  // 3. Find the admin creator (for audit trail)
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "ACCOUNT_MANAGER"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("No admin user found to attribute invite to");

  // 4. Invalidate any prior pending invites for this email
  await prisma.inviteToken.updateMany({
    where: { email: USER.email, usedAt: null },
    data: { usedAt: new Date() },
  });

  // 5. Mint a new invite token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const invite = await prisma.inviteToken.create({
    data: {
      email: USER.email,
      token,
      role: "CUSTOMER",
      companyId: company.id,
      expiresAt,
      createdBy: admin.id,
    },
  });

  const link = `${PORTAL_URL}/invite/${token}`;

  console.log("\n─────────────────────────────────────────────");
  console.log("✓ Invite created");
  console.log("─────────────────────────────────────────────");
  console.log(`  Invite ID : ${invite.id}`);
  console.log(`  Email     : ${USER.email}`);
  console.log(`  Name      : ${USER.name}`);
  console.log(`  Company   : ${company.name}`);
  console.log(`  Role      : CUSTOMER`);
  console.log(`  Expires   : ${expiresAt.toISOString()}`);
  console.log(`\n  🔗 INVITE LINK:\n`);
  console.log(`     ${link}\n`);
  console.log("─────────────────────────────────────────────");
  console.log("Paste the link into your reply to Aaron's email.");
}

main()
  .catch((e) => {
    console.error("✗ Onboarding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
