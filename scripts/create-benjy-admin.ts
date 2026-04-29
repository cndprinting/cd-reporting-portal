/**
 * One-off: ensure there's an ADMIN User record with email bwaxman@cndprinting.com
 * so Benjy can sign in via Microsoft SSO using his real C&D email.
 *
 *   npx tsx scripts/create-benjy-admin.ts
 *
 * - Creates the User if missing
 * - Updates name/role if it exists
 * - Sets passwordHash to a random unguessable string (SSO-only login)
 *
 * The existing seed admin (admin@cndprinting.com / "Sarah") is left alone.
 */

import { config } from "dotenv";
config();

import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const EMAIL = "bwaxman@cndprinting.com";
const NAME = "Benjy Waxman";

async function main() {
  // SSO-only users get an unguessable password hash so credential login is
  // effectively impossible for them.
  const ssoOnlyHash = await hash(`sso-only-${Date.now()}-${Math.random()}`, 10);

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: NAME, role: "ADMIN" },
    });
    console.log(`✓ Updated existing user (id=${existing.id})`);
  } else {
    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: NAME,
        passwordHash: ssoOnlyHash,
        role: "ADMIN",
        // No companyId — admins aren't tied to a customer company
      },
    });
    console.log(`✓ Created new admin user (id=${user.id})`);
  }

  console.log("\n─────────────────────────────────────────────");
  console.log(`  Email: ${EMAIL}`);
  console.log(`  Role:  ADMIN`);
  console.log(`  Login: Sign in with Microsoft at`);
  console.log(`         https://marketing.cndprinting.com/login`);
  console.log("─────────────────────────────────────────────");
  console.log("Old admin@cndprinting.com 'Sarah' login still works for now.");
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
