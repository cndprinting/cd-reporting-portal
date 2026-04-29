/**
 * Fix C&D admin User + InviteToken records to NOT be tied to a customer
 * company. Admins manage all customers — they shouldn't belong to one.
 *
 *   npx tsx scripts/fix-cnd-admin-company-link.ts
 *
 * The yesterday-created invites for Nitay + Albert pointed at "C&D Printing
 * Demo Account" which we archived. The login flow rejects users whose company
 * is archived, so they couldn't sign in. This script null-outs the company
 * link for the C&D team so they can sign in clean.
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const CND_EMAILS = [
  "nlaor@cndprinting.com",
  "awaxman@cndprinting.com",
  "bwaxman@cndprinting.com",
];

async function main() {
  // 1. Existing Users — null out companyId
  const userResult = await prisma.user.updateMany({
    where: { email: { in: CND_EMAILS } },
    data: { companyId: null },
  });
  console.log(`✓ Updated ${userResult.count} existing User records (companyId → null)`);

  // 2. Pending invites — null out companyId
  const inviteResult = await prisma.inviteToken.updateMany({
    where: {
      email: { in: CND_EMAILS },
      usedAt: null,
    },
    data: { companyId: null },
  });
  console.log(`✓ Updated ${inviteResult.count} pending invite records (companyId → null)`);

  // 3. Verify
  console.log("\n=== Final state ===\n");
  for (const email of CND_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: { select: { name: true } } },
    });
    const invite = await prisma.inviteToken.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    console.log(`${email}`);
    if (user) {
      console.log(
        `  user:   ${user.name} (${user.role}) · company: ${user.company?.name ?? "none"}`,
      );
    }
    if (invite) {
      console.log(
        `  invite: ${invite.role} · companyId: ${invite.companyId ?? "none"} · expires ${invite.expiresAt.toISOString().slice(0, 10)}`,
      );
    }
    if (!user && !invite) {
      console.log(`  ⚠️  no user, no invite — would not be able to log in`);
    }
  }
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
