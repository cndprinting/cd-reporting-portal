/**
 * Pre-flight check: confirm Aaron, Nitay, and Albert can each successfully
 * sign in via Microsoft SSO.
 *
 *   npx tsx scripts/verify-sso-readiness.ts
 *
 * For each person, checks:
 *   - Is there an existing User with that email? (would log in immediately)
 *   - Otherwise, is there a non-expired unused InviteToken? (would auto-onboard)
 *   - Or NEITHER → would be rejected with "no account" error
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TARGETS = [
  { name: "Aaron Waxman", email: "aaron@bhlandgroup.co", expected: "CUSTOMER under BH Land Group" },
  { name: "Nitay Laor", email: "nlaor@cndprinting.com", expected: "ADMIN" },
  { name: "Albert Waxman", email: "awaxman@cndprinting.com", expected: "ADMIN" },
  { name: "Benjy Waxman", email: "bwaxman@cndprinting.com", expected: "ADMIN (already verified working)" },
];

async function main() {
  console.log("\n=== SSO Readiness Check ===\n");

  for (const t of TARGETS) {
    console.log(`▶ ${t.name} (${t.email})`);
    console.log(`  Expected: ${t.expected}`);

    // 1. Existing User?
    const user = await prisma.user.findUnique({
      where: { email: t.email },
      include: { company: { select: { name: true, isActive: true } } },
    });
    if (user) {
      console.log(`  ✅ User exists`);
      console.log(`     id:       ${user.id}`);
      console.log(`     name:     ${user.name}`);
      console.log(`     role:     ${user.role}`);
      console.log(`     company:  ${user.company?.name ?? "(none)"}`);
      if (user.company && !user.company.isActive) {
        console.log(`     ⚠️  COMPANY IS ARCHIVED — login will be REJECTED`);
      }
      console.log(`  → SSO login: WILL WORK\n`);
      continue;
    }

    // 2. Pending invite?
    const invite = await prisma.inviteToken.findFirst({
      where: {
        email: t.email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        // Hand-link company to verify it's active
      },
      orderBy: { createdAt: "desc" },
    });

    if (invite) {
      console.log(`  ✅ Pending invite found (will auto-create User on first SSO login)`);
      console.log(`     invite id: ${invite.id}`);
      console.log(`     role:      ${invite.role}`);
      console.log(`     expires:   ${invite.expiresAt.toISOString()}`);
      if (invite.companyId) {
        const company = await prisma.company.findUnique({
          where: { id: invite.companyId },
          select: { name: true, isActive: true },
        });
        console.log(`     company:   ${company?.name ?? "(none)"}`);
        if (company && !company.isActive) {
          console.log(`     ⚠️  COMPANY IS ARCHIVED — login will be REJECTED`);
        }
      }
      console.log(`  → SSO login: WILL WORK (invite consumed on first login)\n`);
      continue;
    }

    // 3. Check for any used/expired invites for context
    const stale = await prisma.inviteToken.findMany({
      where: { email: t.email },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    console.log(`  ❌ NO USER and NO PENDING INVITE`);
    if (stale.length > 0) {
      console.log(`     Stale invites for this email:`);
      for (const s of stale) {
        const status = s.usedAt
          ? `USED ${s.usedAt.toISOString().slice(0, 10)}`
          : `EXPIRED ${s.expiresAt.toISOString().slice(0, 10)}`;
        console.log(`       - ${s.id}: ${status}`);
      }
    }
    console.log(`  → SSO login: WILL FAIL with "No account for that email" — needs new invite\n`);
  }
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
