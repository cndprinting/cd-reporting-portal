/**
 * Level 1 audit — code + DB structural review for MailerCity.
 * Checks each critical area for issues that would surface as bugs
 * for real customers (especially Aaron's first job).
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

interface Finding {
  severity: "critical" | "warning" | "info" | "ok";
  area: string;
  message: string;
}

const findings: Finding[] = [];
const ok = (area: string, message: string) =>
  findings.push({ severity: "ok", area, message });
const info = (area: string, message: string) =>
  findings.push({ severity: "info", area, message });
const warn = (area: string, message: string) =>
  findings.push({ severity: "warning", area, message });
const critical = (area: string, message: string) =>
  findings.push({ severity: "critical", area, message });

async function main() {
  // ─── 1. Companies & users ─────────────────────────────────────────────
  const activeCompanies = await prisma.company.count({ where: { isActive: true } });
  const totalUsers = await prisma.user.count();
  const adminUsers = await prisma.user.count({ where: { role: "ADMIN" } });
  const customerUsers = await prisma.user.count({ where: { role: "CUSTOMER" } });

  ok(
    "Foundation",
    `${activeCompanies} active companies, ${totalUsers} users (${adminUsers} admin, ${customerUsers} customer)`,
  );

  // Customers without a Company (broken scoping)
  const orphanCustomers = await prisma.user.count({
    where: { role: "CUSTOMER", companyId: null },
  });
  if (orphanCustomers > 0) {
    warn("Auth", `${orphanCustomers} CUSTOMER user(s) have no companyId — would see empty dashboard`);
  } else {
    ok("Auth", "All CUSTOMER users have a companyId");
  }

  // Companies with no users (can't be accessed)
  const ghostCompanies = await prisma.company.count({
    where: { isActive: true, users: { none: {} } },
  });
  if (ghostCompanies > 0) {
    warn(
      "Customers",
      `${ghostCompanies} active companies with 0 users — nobody can log in for them yet`,
    );
  } else {
    ok("Customers", "Every active company has at least 1 user");
  }

  // ─── 2. Orders pipeline ──────────────────────────────────────────────
  const orderStatuses = await prisma.order.groupBy({
    by: ["status"],
    _count: true,
    orderBy: { _count: { id: "desc" } },
  });
  info(
    "Orders",
    `Distribution: ${orderStatuses.map((o) => `${o.status}:${o._count}`).join(", ")}`,
  );

  // Orders with no createdBy (broken audit)
  const orphanCreator = await prisma.order.count({ where: { createdBy: "" } });
  if (orphanCreator > 0)
    warn("Orders", `${orphanCreator} orders with empty createdBy`);

  // DROPPED orders without droppedAt (data inconsistency)
  const droppedWithoutTimestamp = await prisma.order.count({
    where: { status: "DROPPED", droppedAt: null },
  });
  if (droppedWithoutTimestamp > 0)
    warn(
      "Orders",
      `${droppedWithoutTimestamp} DROPPED orders without droppedAt timestamp`,
    );

  // Orders missing mailing list (would break Tom's flow)
  const noListNonQuote = await prisma.order.count({
    where: {
      isCustomQuote: false,
      mailingListUrl: null,
      status: { in: ["DRAFT", "IN_PREP", "APPROVED", "SCHEDULED"] },
    },
  });
  if (noListNonQuote > 0)
    info(
      "Orders",
      `${noListNonQuote} active non-quote orders without a mailing list uploaded yet`,
    );

  // ─── 3. Mail pieces ──────────────────────────────────────────────────
  const pieceStatuses = await prisma.mailPiece.groupBy({
    by: ["status"],
    _count: true,
    orderBy: { _count: { id: "desc" } },
  });
  info(
    "MailPieces",
    `${pieceStatuses.map((p) => `${p.status}:${p._count.toLocaleString()}`).join(", ")}`,
  );

  // Pieces with no campaign link (broken)
  const orphanPieces = await prisma.mailPiece.count({
    where: { campaign: null as never },
  }).catch(() => 0);
  // Pieces with companyId mismatch vs campaign
  const mismatched = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint as count FROM "MailPiece" mp
       JOIN "Campaign" c ON c.id = mp."campaignId"
      WHERE mp."companyId" <> c."companyId"`,
  );
  const mismatchCount = Number(mismatched[0].count);
  if (mismatchCount > 0)
    critical(
      "MailPieces",
      `${mismatchCount} pieces have companyId different from their campaign's companyId — would leak data across customers`,
    );
  else ok("MailPieces", "Piece.companyId is consistent with campaign.companyId");

  // Duplicate IMbs (would indicate import bug)
  const dupes = await prisma.$queryRawUnsafe<{ imb: string; count: bigint }[]>(
    `SELECT imb, COUNT(*)::bigint as count FROM "MailPiece"
      GROUP BY imb HAVING COUNT(*) > 1 LIMIT 5`,
  );
  if (dupes.length > 0)
    warn(
      "MailPieces",
      `${dupes.length} duplicate IMb(s) detected (would cause scan-match collisions)`,
    );
  else ok("MailPieces", "No duplicate IMbs");

  // ─── 4. IV-MTR ingestion health ──────────────────────────────────────
  const last7d = new Date(Date.now() - 7 * 86400e3);
  const ingestedSuccess = await prisma.iVFeedIngestion.count({
    where: { status: "COMPLETED", startedAt: { gte: last7d } },
  });
  const ingestedFailed = await prisma.iVFeedIngestion.count({
    where: { status: "FAILED", startedAt: { gte: last7d } },
  });
  const lastPush = await prisma.iVFeedIngestion.findFirst({
    where: { status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  const hoursSincePush = lastPush
    ? Math.floor((Date.now() - lastPush.startedAt.getTime()) / 3600_000)
    : 999;
  info(
    "USPS Feed",
    `Last 7d: ${ingestedSuccess} successful, ${ingestedFailed} failed. Last good push: ${hoursSincePush}h ago.`,
  );
  if (hoursSincePush > 24)
    warn(
      "USPS Feed",
      `No successful USPS push in ${hoursSincePush}h — feed may be silent (could be normal cadence variation)`,
    );

  const totalScans = await prisma.scanEvent.count();
  ok("Scans", `${totalScans.toLocaleString()} ScanEvents total in DB`);

  const orphans = await prisma.unknownImb.count();
  if (orphans > 0)
    info("Scans", `${orphans} orphan IMb scans (USPS scanned, no matching piece stored)`);

  // ─── 5. Critical env vars ────────────────────────────────────────────
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "PORTAL_URL",
  ];
  const integrations = [
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "IV_MTR_INGEST_KEY",
    "USPS_MID",
    "GRAPH_TENANT_ID",
    "GRAPH_CLIENT_ID",
    "GRAPH_CLIENT_SECRET",
    "GOOGLE_OAUTH_CLIENT_ID",
    "MS_GRAPH_TENANT_ID",
    "CRON_SECRET",
    "PRODUCTION_NOTIFY_EMAIL",
    "CSR_NOTIFY_EMAIL",
    "LEADS_NOTIFY_EMAIL",
    "HEALTH_CHECK_EMAILS",
  ];
  // We can only check NODE side; if running script locally, env reflects .env not Vercel
  for (const k of required) {
    if (!process.env[k]) critical("Env", `${k} not set`);
  }
  const missingIntegrations = integrations.filter((k) => !process.env[k]);
  if (missingIntegrations.length > 0) {
    info(
      "Env",
      `${missingIntegrations.length} optional integration env(s) not set in local .env: ${missingIntegrations.join(", ")} (may be set on Vercel — manual check needed)`,
    );
  }

  // ─── 6. Module + rate-card check ─────────────────────────────────────
  const moduleCompanies = await prisma.company.count({
    where: { enabledModules: { isEmpty: false } },
  });
  ok("Modules", `${moduleCompanies} company(ies) with at least 1 enabled module`);

  // ─── 7. Active package balance check ─────────────────────────────────
  const activePkgs = await prisma.mailPackage.count({ where: { status: "ACTIVE" } });
  info("Packages", `${activePkgs} active prepaid package(s) (none = unused feature)`);

  // ─── 8. Stripe linkage on companies ──────────────────────────────────
  const companiesWithStripe = await prisma.company.count({
    where: { isActive: true, stripeCustomerId: { not: null } },
  });
  info(
    "Stripe",
    `${companiesWithStripe} of ${activeCompanies} active companies have a Stripe customer ID (rest will create on first payment)`,
  );

  // ─── 9. Recent activity proof of life ────────────────────────────────
  const lastOrder = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: { orderCode: true, createdAt: true, company: { select: { name: true } } },
  });
  if (lastOrder) {
    info(
      "Activity",
      `Last order created: ${lastOrder.orderCode} (${lastOrder.company.name}) ${lastOrder.createdAt.toISOString().slice(0, 10)}`,
    );
  }

  // ─── Print results ───────────────────────────────────────────────────
  const groups = {
    critical: findings.filter((f) => f.severity === "critical"),
    warning: findings.filter((f) => f.severity === "warning"),
    info: findings.filter((f) => f.severity === "info"),
    ok: findings.filter((f) => f.severity === "ok"),
  };

  console.log("\n" + "═".repeat(70));
  console.log("  MAILERCITY LEVEL 1 AUDIT");
  console.log("═".repeat(70));

  for (const [sev, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    const icon =
      sev === "critical" ? "🔴" : sev === "warning" ? "🟡" : sev === "info" ? "ℹ️" : "✅";
    console.log(`\n${icon}  ${sev.toUpperCase()}  (${items.length})`);
    console.log("─".repeat(70));
    for (const f of items) {
      console.log(`   [${f.area}] ${f.message}`);
    }
  }
  console.log();
}

main().catch(console.error).finally(() => prisma.$disconnect());
