/**
 * Diagnose why Mail Tracking shows zero. Checks:
 *   - IV-MTR feed ingestions in the last 14 days (is anything flowing in?)
 *   - Total MailPieces (and how many have scans)
 *   - UnknownImb count (scans we got but couldn't match to a piece)
 *   - ScanEvents per day for the last 14 days
 *   - Per-company piece counts + delivery rates
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const sinceFourteen = new Date(Date.now() - 14 * 86400e3);
  const sinceSeven = new Date(Date.now() - 7 * 86400e3);

  console.log("\n═════════════════════════════════════════════════════");
  console.log(" MAIL TRACKING DIAGNOSTIC");
  console.log("═════════════════════════════════════════════════════\n");

  // 1. Feed ingestion activity
  const ingestions = await prisma.iVFeedIngestion.findMany({
    where: { startedAt: { gte: sinceFourteen } },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  console.log(`▸ IV-MTR ingestions (last 14 days): ${ingestions.length}`);
  for (const i of ingestions) {
    console.log(
      `   ${i.startedAt.toISOString().slice(0, 16)}  ${i.source.padEnd(15)} ` +
      `received=${i.recordsReceived} inserted=${i.recordsInserted} skipped=${i.recordsSkipped} status=${i.status}`,
    );
  }
  if (ingestions.length === 0) {
    console.log("   ⚠️  NO IV-MTR pushes in 14 days — feed may not be active or wired.");
  }

  // 2. Total scan event activity
  const totalScans = await prisma.scanEvent.count();
  const recentScans = await prisma.scanEvent.count({
    where: { scanDatetime: { gte: sinceSeven } },
  });
  console.log(`\n▸ ScanEvents total: ${totalScans.toLocaleString()}`);
  console.log(`▸ ScanEvents (last 7 days): ${recentScans.toLocaleString()}`);

  // 3. Total MailPieces
  const totalPieces = await prisma.mailPiece.count();
  const piecesWithScans = await prisma.mailPiece.count({
    where: { firstScanAt: { not: null } },
  });
  console.log(`\n▸ MailPieces total: ${totalPieces.toLocaleString()}`);
  console.log(`▸ MailPieces with at least 1 scan: ${piecesWithScans.toLocaleString()}`);

  // 4. UnknownImb
  const unknown = await prisma.unknownImb.count();
  const unknownRecent = await prisma.unknownImb.count({
    where: { lastSeenAt: { gte: sinceSeven } },
  });
  console.log(`\n▸ UnknownImb total: ${unknown.toLocaleString()} (scans we got but couldn't match)`);
  console.log(`▸ UnknownImb (seen in last 7 days): ${unknownRecent.toLocaleString()}`);

  // 5. Per-company breakdown
  console.log(`\n▸ Per-company MailPiece counts:`);
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      _count: { select: { mailPieces: true } },
    },
    orderBy: { name: "asc" },
  });
  for (const c of companies) {
    const delivered = await prisma.mailPiece.count({
      where: { companyId: c.id, status: { in: ["DELIVERED", "DELIVERED_INFERRED"] } },
    });
    const inTransit = await prisma.mailPiece.count({
      where: {
        companyId: c.id,
        status: { in: ["ACCEPTED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
      },
    });
    console.log(
      `   ${c.name.padEnd(35)} pieces=${c._count.mailPieces.toString().padStart(7)} ` +
      `delivered=${delivered.toString().padStart(6)} inTransit=${inTransit.toString().padStart(5)}`,
    );
  }

  // 6. Sample UnknownImb to see what MIDs/serials are coming in
  if (unknownRecent > 0) {
    console.log(`\n▸ Sample UnknownImbs (first 5):`);
    const sample = await prisma.unknownImb.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: 5,
    });
    for (const u of sample) {
      // Decode MID — IMb is 31 chars: 2 barcode-id + 3 service-type + 6/9 MID + 6/9 serial + routing
      // Try 6-digit MID first (most common)
      const mid6 = u.imb.slice(5, 11);
      const mid9 = u.imb.slice(5, 14);
      console.log(
        `   IMb=${u.imb}  occurrences=${u.occurrences}  ` +
        `MID(6)=${mid6}  MID(9)=${mid9}  ` +
        `lastFacility=${u.sampleFacilityCity ?? "-"} ${u.sampleFacilityState ?? ""}`,
      );
    }
  }

  console.log("\n═════════════════════════════════════════════════════\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
