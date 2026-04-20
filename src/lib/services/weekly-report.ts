/**
 * Weekly report generator.
 *
 * For a given Company, pulls the last 7 days of:
 *   - Mail: new pieces, delivered count, delivery rate
 *   - QR: scans
 *   - Calls: totals
 *   - New campaigns started
 *
 * Returns structured data + a rendered HTML email body.
 *
 * Used by the cron route /api/reports/weekly-cron and the manual
 * "Send now" button in the admin UI.
 */

import prisma from "@/lib/prisma";

export interface WeeklyReportData {
  company: { id: string; name: string; logoUrl: string | null };
  weekStart: string;
  weekEnd: string;
  totals: {
    pieces: number;
    delivered: number;
    qrScans: number;
    calls: number;
    campaigns: number;
  };
  deliveryRate: number;
  prior: {
    pieces: number;
    delivered: number;
    qrScans: number;
    calls: number;
  };
  topCampaigns: Array<{
    campaignId: string;
    name: string;
    code: string;
    delivered: number;
    qrScans: number;
    calls: number;
  }>;
}

export async function generateWeeklyReport(companyId: string): Promise<WeeklyReportData | null> {
  if (!prisma) return null;

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  const priorStart = new Date(start);
  priorStart.setDate(priorStart.getDate() - 7);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, logoUrl: true },
  });
  if (!company) return null;

  const [piecesThis, piecesPrior, qrThis, qrPrior, callsThis, callsPrior, campaignsThis, perCampaign] =
    await Promise.all([
      prisma.mailPiece.findMany({
        where: { companyId, createdAt: { gte: start, lte: end } },
        select: { id: true, status: true, campaignId: true },
      }),
      prisma.mailPiece.findMany({
        where: { companyId, createdAt: { gte: priorStart, lt: start } },
        select: { id: true, status: true },
      }),
      prisma.qRCodeMetric.aggregate({
        where: { campaign: { companyId }, date: { gte: start, lte: end } },
        _sum: { scans: true },
      }),
      prisma.qRCodeMetric.aggregate({
        where: { campaign: { companyId }, date: { gte: priorStart, lt: start } },
        _sum: { scans: true },
      }),
      prisma.callLogSummary.aggregate({
        where: { campaign: { companyId }, date: { gte: start, lte: end } },
        _sum: { totalCalls: true },
      }),
      prisma.callLogSummary.aggregate({
        where: { campaign: { companyId }, date: { gte: priorStart, lt: start } },
        _sum: { totalCalls: true },
      }),
      prisma.campaign.count({ where: { companyId, createdAt: { gte: start, lte: end } } }),
      prisma.campaign.findMany({
        where: { companyId },
        select: { id: true, name: true, campaignCode: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

  const pieces = piecesThis.length;
  const delivered = piecesThis.filter(
    (p) => p.status === "DELIVERED" || p.status === "DELIVERED_INFERRED",
  ).length;
  const priorDelivered = piecesPrior.filter(
    (p) => p.status === "DELIVERED" || p.status === "DELIVERED_INFERRED",
  ).length;

  // Per-campaign rollup for top-5 table
  const campaignIds = perCampaign.map((c) => c.id);
  const [perQR, perCalls] = await Promise.all([
    prisma.qRCodeMetric.groupBy({
      by: ["campaignId"],
      where: { campaignId: { in: campaignIds }, date: { gte: start, lte: end } },
      _sum: { scans: true },
    }),
    prisma.callLogSummary.groupBy({
      by: ["campaignId"],
      where: { campaignId: { in: campaignIds }, date: { gte: start, lte: end } },
      _sum: { totalCalls: true },
    }),
  ]);

  const qrByCampaign = new Map(perQR.map((q) => [q.campaignId, q._sum.scans ?? 0]));
  const callsByCampaign = new Map(perCalls.map((c) => [c.campaignId, c._sum.totalCalls ?? 0]));
  const deliveredByCampaign = piecesThis.reduce<Record<string, number>>((acc, p) => {
    if (p.status === "DELIVERED" || p.status === "DELIVERED_INFERRED") {
      acc[p.campaignId] = (acc[p.campaignId] ?? 0) + 1;
    }
    return acc;
  }, {});

  const topCampaigns = perCampaign.map((c) => ({
    campaignId: c.id,
    name: c.name,
    code: c.campaignCode,
    delivered: deliveredByCampaign[c.id] ?? 0,
    qrScans: qrByCampaign.get(c.id) ?? 0,
    calls: callsByCampaign.get(c.id) ?? 0,
  }));

  return {
    company,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    totals: {
      pieces,
      delivered,
      qrScans: qrThis._sum.scans ?? 0,
      calls: callsThis._sum.totalCalls ?? 0,
      campaigns: campaignsThis,
    },
    deliveryRate: pieces ? delivered / pieces : 0,
    prior: {
      pieces: piecesPrior.length,
      delivered: priorDelivered,
      qrScans: qrPrior._sum.scans ?? 0,
      calls: callsPrior._sum.totalCalls ?? 0,
    },
    topCampaigns,
  };
}

export function renderWeeklyReportHTML(d: WeeklyReportData, portalUrl: string): string {
  const delta = (curr: number, prior: number) => {
    if (prior === 0) return curr > 0 ? "+∞" : "—";
    const pct = ((curr - prior) / prior) * 100;
    const arrow = pct >= 0 ? "▲" : "▼";
    const color = pct >= 0 ? "#10b981" : "#ef4444";
    return `<span style="color:${color};font-size:12px;">${arrow} ${Math.abs(pct).toFixed(0)}%</span>`;
  };

  const kpi = (label: string, value: number | string, change: string) => `
    <td style="padding:12px;background:#f8fafc;border-radius:8px;text-align:center;vertical-align:top;width:25%;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${label}</div>
      <div style="font-size:24px;font-weight:700;color:#0f172a;line-height:1.1;">${value}</div>
      <div style="margin-top:4px;">${change}</div>
    </td>`;

  const fmt = (n: number) => n.toLocaleString();

  const weekLabel = `${new Date(d.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(d.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
 <tr><td align="center">
  <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

   <!-- Header -->
   <tr><td style="padding:28px 32px;background:#1e293b;color:#ffffff;">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:4px;">Weekly Campaign Report</div>
    <div style="font-size:22px;font-weight:700;">${d.company.name}</div>
    <div style="font-size:13px;color:#cbd5e1;margin-top:4px;">${weekLabel}</div>
   </td></tr>

   <!-- KPIs -->
   <tr><td style="padding:24px 32px;">
    <table width="100%" cellpadding="4" cellspacing="0">
     <tr>
      ${kpi("Delivered", fmt(d.totals.delivered), delta(d.totals.delivered, d.prior.delivered))}
      ${kpi("QR Scans", fmt(d.totals.qrScans), delta(d.totals.qrScans, d.prior.qrScans))}
      ${kpi("Calls", fmt(d.totals.calls), delta(d.totals.calls, d.prior.calls))}
      ${kpi("Delivery %", (d.deliveryRate * 100).toFixed(1) + "%", "")}
     </tr>
    </table>
   </td></tr>

   <!-- Top campaigns -->
   <tr><td style="padding:0 32px 24px;">
    <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Active Campaigns</div>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
     <thead><tr style="border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;">
      <th align="left" style="padding:6px 8px;">Campaign</th>
      <th align="right" style="padding:6px 8px;">Delivered</th>
      <th align="right" style="padding:6px 8px;">QR</th>
      <th align="right" style="padding:6px 8px;">Calls</th>
     </tr></thead>
     <tbody>
     ${
       d.topCampaigns.length === 0
         ? `<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8;">No active campaigns this week</td></tr>`
         : d.topCampaigns
             .map(
               (c) => `<tr style="border-bottom:1px solid #f1f5f9;">
       <td style="padding:10px 8px;">
        <div style="font-weight:600;color:#0f172a;">${c.name}</div>
        <div style="font-size:11px;color:#64748b;">${c.code}</div>
       </td>
       <td align="right" style="padding:10px 8px;">${fmt(c.delivered)}</td>
       <td align="right" style="padding:10px 8px;">${fmt(c.qrScans)}</td>
       <td align="right" style="padding:10px 8px;">${fmt(c.calls)}</td>
      </tr>`,
             )
             .join("")
     }
     </tbody>
    </table>
   </td></tr>

   <!-- CTA -->
   <tr><td style="padding:0 32px 32px;">
    <a href="${portalUrl}/dashboard/my-tracking" style="display:inline-block;background:#0ea5e9;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
     View Full Report &rarr;
    </a>
   </td></tr>

   <!-- Footer -->
   <tr><td style="padding:16px 32px;background:#f8fafc;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;">
    You&rsquo;re receiving this because you&rsquo;re a contact at ${d.company.name} on the C&amp;D Printing reporting portal.
    <br/>&copy; C&amp;D Printing &middot; <a href="${portalUrl}" style="color:#0ea5e9;text-decoration:none;">cd-reporting-portal.vercel.app</a>
   </td></tr>
  </table>
 </td></tr>
</table>
</body></html>`;
}
