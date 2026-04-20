/**
 * Manual weekly report actions for a specific company.
 *
 * GET  /api/reports/weekly/:companyId           — preview data + HTML (JSON response)
 * GET  /api/reports/weekly/:companyId?format=html — returns rendered HTML directly (for preview iframe)
 * POST /api/reports/weekly/:companyId           — send email now (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateWeeklyReport, renderWeeklyReportHTML } from "@/lib/services/weekly-report";
import { sendEmail } from "@/lib/services/email";

export const runtime = "nodejs";

const PORTAL_URL = process.env.PORTAL_URL ?? "https://cd-reporting-portal.vercel.app";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { companyId } = await params;
  const data = await generateWeeklyReport(companyId);
  if (!data) return NextResponse.json({ error: "no data" }, { status: 404 });

  const html = renderWeeklyReportHTML(data, PORTAL_URL);
  const format = new URL(req.url).searchParams.get("format");
  if (format === "html") {
    return new Response(html, { headers: { "content-type": "text/html" } });
  }
  return NextResponse.json({ data, html });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { companyId } = await params;
  const { recipients: overrideRecipients } = await req.json().catch(() => ({}));

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { users: { select: { email: true } } },
  });
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  const recipients =
    overrideRecipients && Array.isArray(overrideRecipients) && overrideRecipients.length > 0
      ? overrideRecipients
      : company.weeklyReportRecipients
        ? company.weeklyReportRecipients.split(",").map((e) => e.trim())
        : company.users.map((u) => u.email);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "no recipients" }, { status: 400 });
  }

  const data = await generateWeeklyReport(companyId);
  if (!data) return NextResponse.json({ error: "no data" }, { status: 404 });

  const html = renderWeeklyReportHTML(data, PORTAL_URL);
  const subject = `${company.name} — Weekly Report (${new Date(data.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;

  const send = await sendEmail({ to: recipients, subject, html });

  if (send.ok) {
    await prisma.company.update({
      where: { id: companyId },
      data: { lastWeeklyReportAt: new Date() },
    });
  }

  return NextResponse.json({ ...send, recipients });
}
