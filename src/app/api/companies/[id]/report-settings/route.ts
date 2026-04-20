/**
 * Update weekly-report settings for a company.
 * PATCH /api/companies/:id/report-settings
 * Body: { weeklyReportEnabled?: boolean, weeklyReportRecipients?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.company.update({
    where: { id },
    data: {
      weeklyReportEnabled: body.weeklyReportEnabled,
      weeklyReportRecipients: body.weeklyReportRecipients,
    },
    select: {
      id: true,
      weeklyReportEnabled: true,
      weeklyReportRecipients: true,
      lastWeeklyReportAt: true,
    },
  });

  return NextResponse.json(updated);
}
