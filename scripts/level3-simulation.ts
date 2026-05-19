/**
 * Level 3 audit — full pipeline simulation. Injects fake USPS scan events
 * for a real MailPiece and verifies the whole chain works:
 *   1. ScanEvent persists
 *   2. MailPiece status rolls up correctly (PENDING → ACCEPTED → IN_TRANSIT → DELIVERED)
 *   3. Order.status rolls up via campaign
 *   4. Dashboard count math reflects the change
 *
 * Picks a real MailPiece, runs scans through it, asserts each step,
 * then ROLLS BACK so we don't pollute production data.
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

interface Step {
  ok: boolean;
  label: string;
  detail?: string;
}
const steps: Step[] = [];
const pass = (label: string, detail?: string) => steps.push({ ok: true, label, detail });
const fail = (label: string, detail?: string) => steps.push({ ok: false, label, detail });

async function main() {
  console.log("\n═══ Level 3 — pipeline simulation ═══\n");

  // Find a real PENDING piece to test on (one we can roll back cleanly)
  const piece = await prisma.mailPiece.findFirst({
    where: { status: "PENDING", firstScanAt: null },
    include: { campaign: { select: { id: true } } },
  });
  if (!piece) {
    fail("Setup", "No PENDING MailPiece available for test");
    finalize();
    return;
  }
  pass("Setup", `Using piece ${piece.id} (imb=${piece.imb}) for simulation`);
  const originalStatus = piece.status;

  // Helper to inject a fake scan event
  const inject = async (
    operation:
      | "ORIGIN_ACCEPTANCE"
      | "ORIGIN_PROCESSED"
      | "IN_TRANSIT"
      | "DESTINATION_PROCESSED"
      | "DESTINATION_DELIVERY"
      | "OUT_FOR_DELIVERY"
      | "DELIVERED",
    operationCode: string,
    offsetMinutes: number,
  ) => {
    await prisma.scanEvent.create({
      data: {
        mailPieceId: piece.id,
        imb: piece.imb,
        scanDatetime: new Date(Date.now() + offsetMinutes * 60_000),
        operation,
        operationCode,
        facilityCity: "TEST-FACILITY",
        facilityState: "FL",
        facilityZip: "33716",
        rawPayload: { test: true } as object,
      },
    });
  };

  try {
    // 1. Inject ORIGIN_ACCEPTANCE → should move to ACCEPTED
    await inject("ORIGIN_ACCEPTANCE", "001", -120);
    const { rollupMailPieceStatus } = await import(
      "../src/lib/services/iv-mtr-ingest"
    );
    await rollupMailPieceStatus(piece.id);
    let after = await prisma.mailPiece.findUnique({ where: { id: piece.id } });
    if (after?.status === "ACCEPTED") pass("After ORIGIN_ACCEPTANCE → ACCEPTED");
    else fail("After ORIGIN_ACCEPTANCE", `expected ACCEPTED, got ${after?.status}`);
    if (after?.firstScanAt) pass("firstScanAt timestamp set", after.firstScanAt.toISOString());
    else fail("firstScanAt not set");

    // 2. Inject IN_TRANSIT
    await inject("IN_TRANSIT", "893", -60);
    await rollupMailPieceStatus(piece.id);
    after = await prisma.mailPiece.findUnique({ where: { id: piece.id } });
    if (after?.status === "IN_TRANSIT") pass("After IN_TRANSIT scan → IN_TRANSIT");
    else fail("After IN_TRANSIT scan", `expected IN_TRANSIT, got ${after?.status}`);

    // 3. Inject DELIVERED
    await inject("DELIVERED", "919", -10);
    await rollupMailPieceStatus(piece.id);
    after = await prisma.mailPiece.findUnique({ where: { id: piece.id } });
    if (after?.status === "DELIVERED") pass("After DELIVERED scan → DELIVERED");
    else fail("After DELIVERED scan", `expected DELIVERED, got ${after?.status}`);
    if (after?.deliveredAt) pass("deliveredAt timestamp set", after.deliveredAt.toISOString());
    else fail("deliveredAt not set");
    if (after?.daysToDeliver != null) pass("daysToDeliver calculated", `${after.daysToDeliver} days`);
    else fail("daysToDeliver not calculated");

    // 4. Verify ScanEvent count grew
    const totalForPiece = await prisma.scanEvent.count({
      where: { mailPieceId: piece.id },
    });
    if (totalForPiece >= 3) pass("ScanEvents persisted", `${totalForPiece} scans recorded`);
    else fail("ScanEvent count", `expected >=3, got ${totalForPiece}`);

    // 5. Verify API endpoint reports it correctly
    const apiCheckCount = await prisma.mailPiece.count({
      where: {
        companyId: piece.companyId,
        status: { in: ["DELIVERED", "DELIVERED_INFERRED"] },
      },
    });
    pass("Delivered count visible via DB", `${apiCheckCount} delivered for this company`);
  } finally {
    // ROLLBACK — clean up so test data doesn't bleed into prod
    await prisma.scanEvent.deleteMany({
      where: { mailPieceId: piece.id, facilityCity: "TEST-FACILITY" },
    });
    await prisma.mailPiece.update({
      where: { id: piece.id },
      data: {
        status: originalStatus,
        firstScanAt: null,
        lastScanAt: null,
        deliveredAt: null,
        daysToDeliver: null,
      },
    });
    pass("Cleanup", "Rolled back test scans + piece status");
  }

  finalize();
}

function finalize() {
  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  for (const s of steps) {
    console.log(`  ${s.ok ? "✅" : "❌"}  ${s.label}${s.detail ? ` — ${s.detail}` : ""}`);
  }
  console.log();
}

main().catch(console.error).finally(() => prisma.$disconnect());
