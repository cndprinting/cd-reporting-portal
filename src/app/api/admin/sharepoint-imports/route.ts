/**
 * Admin: list recent SharePoint auto-imports for the queue UI.
 *
 * GET /api/admin/sharepoint-imports?limit=100
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const limit = Math.min(
    500,
    parseInt(new URL(req.url).searchParams.get("limit") ?? "100", 10),
  );

  const items = await prisma.sharepointImport.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  // Hydrate company names in one query
  const companyIds = [...new Set(items.map((i) => i.matchedCompanyId).filter((x): x is string => !!x))];
  const companies = companyIds.length
    ? await prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      })
    : [];
  const companyById = new Map(companies.map((c) => [c.id, c]));

  const hydrated = items.map((i) => ({
    ...i,
    matchedCompany: i.matchedCompanyId ? companyById.get(i.matchedCompanyId) ?? null : null,
  }));

  return NextResponse.json({ items: hydrated });
}
