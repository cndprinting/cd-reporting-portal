/**
 * One-off: invite Nitay Laor and Albert Waxman as ADMINs of C&D Printing.
 *
 *   npx tsx scripts/onboard-cnd-admins.ts
 *
 * Idempotent — skips users that already exist, revokes their prior pending
 * invites, and mints new tokens.
 *
 * Hard-coded emails:
 *   - nitay@cndprinting.com     (adjust if different)
 *   - albert@cndprinting.com    (adjust if different)
 *
 * If the real emails differ, pass them via NITAY_EMAIL / ALBERT_EMAIL env vars
 * before running.
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
const INVITE_TTL_DAYS = 14;

const INVITES: { email: string; name: string }[] = [
  { email: process.env.NITAY_EMAIL ?? "nitay@cndprinting.com", name: "Nitay Laor" },
  { email: process.env.ALBERT_EMAIL ?? "albert@cndprinting.com", name: "Albert Waxman" },
];

async function main() {
  // Find an admin to attribute invites to
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "ACCOUNT_MANAGER"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("No admin user found to attribute invites to");

  // Find C&D Printing company (so admins are linked; optional for ADMINs)
  const cnd = await prisma.company.findFirst({
    where: {
      OR: [
        { slug: "cnd-printing" },
        { slug: "cd-printing" },
        { name: { contains: "C&D", mode: "insensitive" } },
      ],
    },
  });
  if (cnd) {
    console.log(`• C&D company row: ${cnd.name} (id=${cnd.id})`);
  } else {
    console.log("• No C&D company row found — admins will not be linked to a company");
  }

  for (const { email, name } of INVITES) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log(`• User already exists: ${email} (${existingUser.role}) — skipped`);
      continue;
    }

    await prisma.inviteToken.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const invite = await prisma.inviteToken.create({
      data: {
        email,
        token,
        role: "ADMIN",
        companyId: cnd?.id ?? null,
        expiresAt,
        createdBy: admin.id,
      },
    });

    const link = `${PORTAL_URL}/invite/${token}`;
    console.log("\n─────────────────────────────────────────────");
    console.log(`✓ Invite created — ${name} (ADMIN)`);
    console.log(`  Email   : ${email}`);
    console.log(`  Expires : ${expiresAt.toISOString()}`);
    console.log(`  Invite  : ${invite.id}`);
    console.log(`  🔗 LINK  : ${link}`);
    console.log("─────────────────────────────────────────────");
  }
}

main()
  .catch((e) => {
    console.error("✗ Onboarding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
