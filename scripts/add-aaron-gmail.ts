/**
 * Add Aaron's personal Gmail (aaronjwaxman00@gmail.com) as an additional
 * CUSTOMER login under BH Land Group. He can already sign in with his
 * work email aaron@bhlandgroup.co (Microsoft SSO) — this lets him also
 * sign in via Google with his personal Gmail.
 *
 *   npx tsx scripts/add-aaron-gmail.ts
 *
 * Both logins land him at BH Land Group with full customer access.
 */

import { randomBytes } from "crypto";
import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PORTAL_URL = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
const EMAIL = "aaronjwaxman00@gmail.com";
const NAME = "Aaron Waxman";
const TTL_DAYS = 14;

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: "BH Land Group", isActive: true },
  });
  if (!company) throw new Error("BH Land Group not found / inactive");

  const admin = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "ACCOUNT_MANAGER"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("No admin user");

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`• User already exists for ${EMAIL} — no new invite needed.`);
    return;
  }

  // Invalidate any stale invites
  await prisma.inviteToken.updateMany({
    where: { email: EMAIL, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
  const invite = await prisma.inviteToken.create({
    data: {
      email: EMAIL,
      token,
      role: "CUSTOMER",
      companyId: company.id,
      expiresAt,
      createdBy: admin.id,
    },
  });

  console.log("\n─────────────────────────────────────────────");
  console.log(`✓ Invite created for Aaron's Gmail`);
  console.log(`  Email:   ${EMAIL}`);
  console.log(`  Company: ${company.name}`);
  console.log(`  Role:    CUSTOMER`);
  console.log(`  Expires: ${expiresAt.toISOString()}`);
  console.log(`  Invite:  ${invite.id}`);
  console.log("─────────────────────────────────────────────");
  console.log(`\n  🔗 INVITE LINK (in case Google SSO has issues):`);
  console.log(`     ${PORTAL_URL}/invite/${token}`);
  console.log(`\n  ✨ EASIER PATH — Google SSO:`);
  console.log(`     ${PORTAL_URL}/login → Sign in with Google → ${EMAIL}`);
  console.log(`     The invite auto-consumes on first SSO login.`);
  console.log("─────────────────────────────────────────────");
  console.log(
    `\n  ⚠️  REMINDER: Add ${EMAIL} as a Google Test User at:`,
  );
  console.log(`     console.cloud.google.com → MailerCity Marketing Portal →`);
  console.log(`     Audience → Test users → + Add Users`);
  console.log(`     (Otherwise Google SSO will reject him with "access blocked")`);
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
