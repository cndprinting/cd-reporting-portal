/**
 * Onboard Thomas Campanello (prepress lead) as ADMIN.
 *
 *   npx tsx scripts/onboard-tom.ts
 *
 * Tom drops AccuZIP files into SharePoint already, but giving him a portal
 * login lets him verify his uploads landed via the auto-import queue at
 * /dashboard/admin/auto-import without bothering Benjy.
 *
 * Granting ADMIN role since Tom is C&D internal staff (same trust level as
 * Nitay/Albert). Pragmatic — adding a granular PREPRESS role would require
 * touching auth checks across dozens of routes.
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
const TTL_DAYS = 14;
const EMAIL = "tcamp@cndprinting.com";
const NAME = "Thomas Campanello";

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "ACCOUNT_MANAGER"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("No admin user to attribute the invite to");

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`• User already exists for ${EMAIL} (id=${existing.id}, role=${existing.role})`);
    console.log(`  He can sign in directly via Microsoft SSO.`);
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
      role: "ADMIN",
      companyId: null, // C&D internal — not tied to a customer
      expiresAt,
      createdBy: admin.id,
    },
  });

  const link = `${PORTAL_URL}/invite/${token}`;
  console.log("\n─────────────────────────────────────────────");
  console.log(`✓ Invite created — ${NAME} (ADMIN)`);
  console.log(`  Email   : ${EMAIL}`);
  console.log(`  Expires : ${expiresAt.toISOString()}`);
  console.log(`  Invite  : ${invite.id}`);
  console.log(`\n  🔗 LINK : ${link}`);
  console.log("─────────────────────────────────────────────");
  console.log(`Or even simpler: tell Tom to go to ${PORTAL_URL}/login`);
  console.log(`and click "Sign in with Microsoft" — invite auto-consumes.`);
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
