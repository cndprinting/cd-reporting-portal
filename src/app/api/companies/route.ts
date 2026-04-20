/**
 * Admin list of companies.
 * GET /api/companies?include=reportSettings
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
  if (!prisma) {
    // Demo fallback
    return NextResponse.json({
      companies: [
        {
          id: "demo-company-1",
          name: "C&D Printing Demo Account",
          weeklyReportEnabled: true,
          weeklyReportRecipients: null,
          lastWeeklyReportAt: null,
          users: [{ email: "admin@cndprinting.com", name: "Sarah Johnson" }],
        },
        {
          id: "demo-company-2",
          name: "Sunshine Realty Group",
          weeklyReportEnabled: true,
          weeklyReportRecipients: null,
          lastWeeklyReportAt: null,
          users: [{ email: "john@sunshinerealty.com", name: "John Rivera" }],
        },
        {
          id: "demo-company-3",
          name: "Palm Coast Insurance",
          weeklyReportEnabled: false,
          weeklyReportRecipients: "ops@palmcoastins.com",
          lastWeeklyReportAt: null,
          users: [],
        },
      ],
    });
  }

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      weeklyReportEnabled: true,
      weeklyReportRecipients: true,
      lastWeeklyReportAt: true,
      users: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json({ companies });
}
