/**
 * Weekly customer report cron.
 * Runs every Monday 7am ET (12pm UTC) — see vercel.json.
 * Loops active companies with weeklyReportEnabled=true, sends email via Resend.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateWeeklyReport, renderWeeklyReportHTML } from "@/lib/services/weekly-report";
import { sendEmail } from "@/lib/services/email";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const portalUrl = process.env.PORTAL_URL ?? "https://cd-reporting-portal.vercel.app";

  const companies = await prisma.company.findMany({
    where: { isActive: true, weeklyReportEnabled: true },
    include: { users: { select: { email: true, role: true } } },
  });

  const results: Array<{ companyId: string; recipients: number; ok: boolean; error?: string }> = [];

  for (const company of companies) {
    // Determine recipients
    const explicit = company.weeklyReportRecipients
      ?.split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const recipients =
      explicit && explicit.length > 0
        ? explicit
        : company.users.map((u) => u.email).filter(Boolean);

    if (recipients.length === 0) {
      results.push({ companyId: company.id, recipients: 0, ok: false, error: "no recipients" });
      continue;
    }

    const data = await generateWeeklyReport(company.id);
    if (!data) {
      results.push({ companyId: company.id, recipients: recipients.length, ok: false, error: "no data" });
      continue;
    }

    const html = renderWeeklyReportHTML(data, portalUrl);
    const subject = `${company.name} — Weekly Report (${new Date(data.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;

    const send = await sendEmail({ to: recipients, subject, html });
    results.push({
      companyId: company.id,
      recipients: recipients.length,
      ok: send.ok,
      error: send.error,
    });

    if (send.ok) {
      await prisma.company.update({
        where: { id: company.id },
        data: { lastWeeklyReportAt: new Date() },
      });
      await prisma.reportExport.create({
        data: {
          userId: "system",
          companyId: company.id,
          format: "email",
          status: "completed",
          filters: JSON.stringify({ kind: "weekly" }),
        },
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
