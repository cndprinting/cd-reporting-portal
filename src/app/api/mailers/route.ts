/**
 * Admin-only list of mailer customers with tracking rollups.
 * GET /api/mailers
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getDemoMailersList } from "@/lib/demo-data";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!prisma) return NextResponse.json(getDemoMailersList());

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      _count: { select: { campaigns: true, mailPieces: true } },
    },
  });

  // Rollup per-company delivered counts + distinct MIDs
  const companyIds = companies.map((c) => c.id);
  const [statusRows, midRows] = await Promise.all([
    prisma.mailPiece.groupBy({
      by: ["companyId", "status"],
      where: { companyId: { in: companyIds } },
      _count: true,
    }),
    prisma.mailPiece.groupBy({
      by: ["companyId", "imbMailerId"],
      where: { companyId: { in: companyIds } },
      _count: true,
    }),
  ]);

  const mailers = companies.map((c) => {
    const statusFor = statusRows.filter((r) => r.companyId === c.id);
    const pieces = statusFor.reduce((s, r) => s + r._count, 0);
    const delivered = statusFor
      .filter((r) => r.status === "DELIVERED" || r.status === "DELIVERED_INFERRED")
      .reduce((s, r) => s + r._count, 0);
    // "In transit" = has at least one scan AND not yet delivered (excludes
    // PENDING — pieces that USPS never scanned, usually older mailings past
    // the scan window).
    const inTransit = statusFor
      .filter((r) =>
        ["ACCEPTED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(r.status),
      )
      .reduce((s, r) => s + r._count, 0);
    // "Pending" = imported but no USPS scan yet
    const pending = statusFor
      .filter((r) => r.status === "PENDING")
      .reduce((s, r) => s + r._count, 0);
    const undeliverable = statusFor
      .filter((r) => r.status === "UNDELIVERABLE")
      .reduce((s, r) => s + r._count, 0);
    // Pieces that have hit the USPS network (excludes PENDING)
    const trackedCount = pieces - pending;
    const mids = midRows.filter((r) => r.companyId === c.id).map((r) => r.imbMailerId).filter(Boolean);

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      industry: c.industry,
      campaignCount: c._count.campaigns,
      pieceCount: pieces,
      deliveredCount: delivered,
      inTransitCount: inTransit,
      pendingCount: pending,
      undeliverableCount: undeliverable,
      trackedCount, // pieces with at least one scan
      // Delivery rate is more honest when computed against pieces actually
      // tracked by USPS (not pending pieces that may never get scanned)
      deliveryRate: trackedCount ? delivered / trackedCount : 0,
      mailerIds: [...new Set(mids)],
    };
  });

  return NextResponse.json({ mailers });
}
