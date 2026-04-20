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
    const mids = midRows.filter((r) => r.companyId === c.id).map((r) => r.imbMailerId).filter(Boolean);

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      industry: c.industry,
      campaignCount: c._count.campaigns,
      pieceCount: pieces,
      deliveredCount: delivered,
      deliveryRate: pieces ? delivered / pieces : 0,
      mailerIds: [...new Set(mids)],
    };
  });

  return NextResponse.json({ mailers });
}
