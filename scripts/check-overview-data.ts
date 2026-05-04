import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const dist = await prisma.$queryRawUnsafe<{ s: string; count: bigint }[]>(
    `SELECT status::text as s, COUNT(*)::bigint as count FROM "MailPiece" GROUP BY status ORDER BY count DESC`,
  );
  console.log("\nCurrent MailPiece status distribution:");
  for (const r of dist) console.log(`   ${r.s}: ${Number(r.count).toLocaleString()}`);

  // Mimic what /api/mailers does
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const statusRows = await prisma.mailPiece.groupBy({
    by: ["companyId", "status"],
    where: { companyId: { in: companies.map((c) => c.id) } },
    _count: true,
  });

  let totalPieces = 0;
  let totalExpired = 0;
  let totalPending = 0;
  let totalAccepted = 0;
  let totalInTransit = 0;
  let totalDelivered = 0;
  for (const c of companies) {
    const rows = statusRows.filter((r) => r.companyId === c.id);
    for (const r of rows) {
      totalPieces += r._count;
      if (r.status === "EXPIRED_NO_SCAN") totalExpired += r._count;
      if (r.status === "PENDING") totalPending += r._count;
      if (r.status === "ACCEPTED") totalAccepted += r._count;
      if (r.status === "IN_TRANSIT") totalInTransit += r._count;
      if (r.status === "DELIVERED" || r.status === "DELIVERED_INFERRED")
        totalDelivered += r._count;
    }
  }
  const totalActive = totalPieces - totalExpired;
  const totalTracked = totalAccepted + totalInTransit + totalDelivered;

  console.log("\nWhat the dashboard SHOULD show:");
  console.log(`   totalPieces:    ${totalPieces.toLocaleString()}`);
  console.log(`   totalExpired:   ${totalExpired.toLocaleString()}`);
  console.log(`   totalActive:    ${totalActive.toLocaleString()} ← denominator`);
  console.log(`   totalTracked:   ${totalTracked.toLocaleString()} ← numerator`);
  console.log(`   totalPending:   ${totalPending.toLocaleString()}`);
  console.log(`   totalDelivered: ${totalDelivered.toLocaleString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
