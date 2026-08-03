/**
 * Daily tracking health check.
 *
 * PAUSED 2026-08-03 per Benjy — cron entry removed from vercel.json until
 * MailerCity lead volume warrants daily monitoring again. Endpoint still
 * works if hit manually; re-arm by adding back to vercel.json:
 *   { "path": "/api/cron/health-check", "schedule": "0 13 * * *" }
 *
 * Cron-triggered (Vercel cron, see vercel.json). Runs every morning, surveys
 * the IV-MTR pipeline + active orders, and emails admins a one-line summary.
 *
 * Things it flags:
 *   - USPS push silence (no successful ingestion in last 4 hours)
 *   - Failed ingestions in last 24h
 *   - Active orders dropped 2+ days ago with 0 USPS scans
 *   - Orders dropped 5+ days ago with < 30% pieces scanned
 *   - SharePoint imports that hit FAILED status in last 24h
 *
 * Recipients: env HEALTH_CHECK_EMAILS (comma-separated) or fall back to
 * SALES_NOTIFY_EMAIL or bwaxman@cndprinting.com.
 *
 * Auth: Vercel cron sends authorization=Bearer <CRON_SECRET>. Manual runs
 * can pass ?key=<CRON_SECRET>. Returns the report JSON either way.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/services/email";

export const runtime = "nodejs";
export const maxDuration = 120;

interface HealthIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  /** Optional deep-link */
  href?: string;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev/preview without secret = allow
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("key") === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const issues: HealthIssue[] = [];

  // --- USPS feed silence check ---
  const lastSuccessfulPush = await prisma.iVFeedIngestion.findFirst({
    where: { status: "COMPLETED", source: "iv-mtr-push", recordsInserted: { gt: 0 } },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true, recordsInserted: true },
  });
  const usspsLastSeen = lastSuccessfulPush?.startedAt;
  if (!usspsLastSeen || usspsLastSeen < fourHoursAgo) {
    issues.push({
      severity: "critical",
      category: "USPS Feed",
      message: usspsLastSeen
        ? `No successful USPS push in ${Math.round((now.getTime() - usspsLastSeen.getTime()) / 3600_000)}h. Last good push at ${usspsLastSeen.toISOString()}.`
        : "Never received a successful USPS push. Feed may not be wired.",
      href: "/dashboard/admin/ingestion",
    });
  }

  // --- Failed ingestions in last 24h ---
  const failedIngestions = await prisma.iVFeedIngestion.count({
    where: { status: "FAILED", startedAt: { gte: dayAgo } },
  });
  if (failedIngestions > 0) {
    issues.push({
      severity: "warning",
      category: "USPS Feed",
      message: `${failedIngestions} USPS push(es) failed in last 24h.`,
      href: "/dashboard/admin/ingestion",
    });
  }

  // --- SharePoint imports that failed in last 24h ---
  const failedSharepoint = await prisma.sharepointImport.findMany({
    where: { status: "FAILED", startedAt: { gte: dayAgo } },
    select: { fileName: true, errorMessage: true },
    take: 5,
  });
  if (failedSharepoint.length > 0) {
    issues.push({
      severity: "warning",
      category: "SharePoint",
      message: `${failedSharepoint.length} file(s) failed import: ${failedSharepoint
        .map((f) => f.fileName)
        .join(", ")}`,
      href: "/dashboard/admin/auto-import",
    });
  }

  // --- Active orders with no scan progression ---
  // For each Order in DROPPED status, check piece-level scan progress
  const droppedOrders = await prisma.order.findMany({
    where: {
      status: { in: ["DROPPED", "DELIVERING", "SCHEDULED"] },
      droppedAt: { not: null, lte: twoDaysAgo },
    },
    select: {
      id: true,
      orderCode: true,
      droppedAt: true,
      quantity: true,
      campaignId: true,
      company: { select: { name: true } },
    },
  });

  for (const order of droppedOrders) {
    if (!order.droppedAt) continue;
    const ageDays = Math.floor(
      (now.getTime() - order.droppedAt.getTime()) / (24 * 60 * 60 * 1000),
    );

    // Approximate piece counts via campaignId (since we don't link piece→order directly)
    const [totalActive, scanned] = await Promise.all([
      prisma.mailPiece.count({
        where: { campaignId: order.campaignId, status: { not: "EXPIRED_NO_SCAN" } },
      }),
      prisma.mailPiece.count({
        where: {
          campaignId: order.campaignId,
          status: { notIn: ["PENDING", "EXPIRED_NO_SCAN"] },
        },
      }),
    ]);
    if (totalActive === 0) continue;

    const scannedPct = (scanned / totalActive) * 100;

    if (scanned === 0 && order.droppedAt < twoDaysAgo) {
      issues.push({
        severity: "critical",
        category: "Tracking",
        message: `${order.company.name} order ${order.orderCode} (${order.quantity?.toLocaleString() ?? "?"} pieces) dropped ${ageDays}d ago — 0 USPS scans. Investigate IMb format or USPS feed.`,
        href: `/dashboard/orders/${order.id}`,
      });
    } else if (scannedPct < 30 && order.droppedAt < fiveDaysAgo) {
      issues.push({
        severity: "warning",
        category: "Tracking",
        message: `${order.company.name} order ${order.orderCode} dropped ${ageDays}d ago — only ${scannedPct.toFixed(0)}% scanned (expected 60%+).`,
        href: `/dashboard/orders/${order.id}`,
      });
    }
  }

  // --- Headline metric: total scans in last 24h ---
  const recentScans = await prisma.scanEvent.count({
    where: { scanDatetime: { gte: dayAgo } },
  });

  const allOk = issues.length === 0;

  // Compose email body
  const bodyHtml = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#1A1814;padding:24px;max-width:600px;margin:0 auto;">
<h2 style="margin:0 0 4px;font-size:18px;">📬 MailerCity Tracking Health — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</h2>
<p style="color:#6B6660;margin:0 0 20px;font-size:13px;">Daily auto-check at ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>

<div style="background:${allOk ? "#ECFDF5" : "#FEF3C7"};border:1px solid ${allOk ? "#10B981" : "#F59E0B"};border-radius:6px;padding:14px;margin-bottom:20px;">
  <div style="font-size:18px;font-weight:600;color:${allOk ? "#065F46" : "#92400E"};">
    ${allOk ? "✅ All systems healthy" : `⚠ ${issues.length} issue${issues.length === 1 ? "" : "s"} detected`}
  </div>
  <div style="font-size:13px;color:${allOk ? "#047857" : "#78350F"};margin-top:4px;">
    ${recentScans.toLocaleString()} USPS scans ingested in the last 24h${usspsLastSeen ? ` · last push ${Math.round((now.getTime() - usspsLastSeen.getTime()) / 60000)} min ago` : ""}.
  </div>
</div>

${
  issues.length > 0
    ? `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      ${issues
        .map(
          (issue) => `
        <tr><td style="padding:10px 0;border-bottom:1px solid #E8E0D2;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${
            issue.severity === "critical" ? "#B91C1C" : "#92400E"
          };font-weight:600;margin-bottom:2px;">
            ${issue.severity === "critical" ? "🔴" : "🟡"} ${issue.category}
          </div>
          <div style="font-size:13px;color:#1A1814;line-height:1.5;">
            ${issue.message}
          </div>
          ${
            issue.href
              ? `<a href="${process.env.PORTAL_URL ?? "https://marketing.cndprinting.com"}${issue.href}" style="font-size:12px;color:#B85C3D;text-decoration:none;">Investigate →</a>`
              : ""
          }
        </td></tr>`,
        )
        .join("")}
    </table>`
    : "<p style='color:#6B6660;font-size:13px;'>Pipeline is healthy. No action needed.</p>"
}

<hr style="margin:24px 0 12px;border:none;border-top:1px solid #E8E0D2;" />
<p style="font-size:11px;color:#6B6660;">
  Auto-generated daily by C&amp;D MailerCity. Adjust recipients via HEALTH_CHECK_EMAILS env var.
</p>
</body></html>`;

  // Send to admin recipients only
  const recipients = (
    process.env.HEALTH_CHECK_EMAILS ??
    process.env.SALES_NOTIFY_EMAIL ??
    "bwaxman@cndprinting.com"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let emailSent = false;
  // Always email if there are issues; otherwise email Mondays only (weekly heartbeat)
  const isMonday = now.getUTCDay() === 1;
  if (!allOk || isMonday) {
    const r = await sendEmail({
      to: recipients,
      subject: allOk
        ? "✅ MailerCity weekly health — all good"
        : `⚠ MailerCity tracking — ${issues.length} issue${issues.length === 1 ? "" : "s"}`,
      html: bodyHtml,
    });
    emailSent = r.ok;
  }

  return NextResponse.json({
    ok: allOk,
    issueCount: issues.length,
    issues,
    metrics: {
      recentScans24h: recentScans,
      lastUspsPush: usspsLastSeen?.toISOString() ?? null,
      failedIngestions24h: failedIngestions,
      failedSharepoint24h: failedSharepoint.length,
      activeOrdersChecked: droppedOrders.length,
    },
    emailSent,
    recipients: emailSent ? recipients : null,
  });
}
