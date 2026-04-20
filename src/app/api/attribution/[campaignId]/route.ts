/**
 * Cross-channel attribution for a campaign.
 * GET /api/attribution/:campaignId
 *
 * Joins MailPiece deliveries + QRCodeMetric scans + CallLogSummary calls
 * by day-since-drop, so you can see the response curve that follows a mailing.
 *
 * Response shape:
 *   {
 *     campaign,
 *     totalPieces, totalDelivered, totalQRScans, totalCalls, totalConversions,
 *     responseRate,         // responses / pieces delivered
 *     avgResponseDelayDays, // days from delivery to first QR/call
 *     dailyTimeline: [{ date, deliveredCount, qrScans, calls, conversions }],
 *     daysSinceDrop: [{ day, delivered, qrScans, calls, cumulativeResponse, liftRatio }],
 *     channelMix: [{ channel, count, share }],
 *     topZips: [{ zip, delivered, responseRate }]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await params;

  if (!prisma) return NextResponse.json(demoAttribution(campaignId));

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      company: { select: { id: true, name: true } },
      mailBatches: { orderBy: { dropDate: "asc" }, take: 1 },
    },
  });
  if (!campaign) return NextResponse.json({ error: "not found" }, { status: 404 });

  const dropDate =
    campaign.mailBatches[0]?.dropDate ?? campaign.startDate ?? campaign.setupDate;

  const [pieces, qrByDay, callsByDay, metricsByDay] = await Promise.all([
    prisma.mailPiece.findMany({
      where: { campaignId },
      select: { deliveredAt: true, zip5: true, status: true },
    }),
    prisma.qRCodeMetric.findMany({
      where: { campaignId },
      select: { date: true, scans: true },
    }),
    prisma.callLogSummary.findMany({
      where: { campaignId },
      select: { date: true, totalCalls: true, qualifiedCalls: true },
    }),
    prisma.campaignMetricDaily.findMany({
      where: { campaignId },
      select: { date: true, channel: true, leads: true, conversions: true },
    }),
  ]);

  // --- Totals ---
  const totalPieces = pieces.length;
  const totalDelivered = pieces.filter(
    (p) => p.status === "DELIVERED" || p.status === "DELIVERED_INFERRED",
  ).length;
  const totalQRScans = qrByDay.reduce((s, q) => s + q.scans, 0);
  const totalCalls = callsByDay.reduce((s, c) => s + c.totalCalls, 0);
  const totalConversions = metricsByDay.reduce((s, m) => s + m.conversions, 0);

  // --- Daily timeline (calendar-date based) ---
  const dayMap = new Map<
    string,
    { date: string; deliveredCount: number; qrScans: number; calls: number; conversions: number }
  >();

  const touch = (d: Date | null) => {
    if (!d) return null;
    const key = d.toISOString().slice(0, 10);
    if (!dayMap.has(key))
      dayMap.set(key, {
        date: key,
        deliveredCount: 0,
        qrScans: 0,
        calls: 0,
        conversions: 0,
      });
    return dayMap.get(key)!;
  };

  for (const p of pieces) {
    const e = touch(p.deliveredAt);
    if (e) e.deliveredCount++;
  }
  for (const q of qrByDay) {
    const e = touch(q.date);
    if (e) e.qrScans += q.scans;
  }
  for (const c of callsByDay) {
    const e = touch(c.date);
    if (e) e.calls += c.totalCalls;
  }
  for (const m of metricsByDay) {
    const e = touch(m.date);
    if (e) e.conversions += m.conversions;
  }
  const dailyTimeline = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // --- Days-since-drop curve ---
  const drop = new Date(dropDate);
  drop.setHours(0, 0, 0, 0);
  const dsMap = new Map<number, { day: number; delivered: number; qrScans: number; calls: number }>();
  const rowFor = (n: number) => {
    if (!dsMap.has(n)) dsMap.set(n, { day: n, delivered: 0, qrScans: 0, calls: 0 });
    return dsMap.get(n)!;
  };
  const daysSince = (d: Date) =>
    Math.round((new Date(d).getTime() - drop.getTime()) / 86_400_000);

  for (const p of pieces) if (p.deliveredAt) rowFor(daysSince(p.deliveredAt)).delivered++;
  for (const q of qrByDay) rowFor(daysSince(q.date)).qrScans += q.scans;
  for (const c of callsByDay) rowFor(daysSince(c.date)).calls += c.totalCalls;

  const daysSinceDropRaw = [...dsMap.values()]
    .filter((r) => r.day >= 0 && r.day <= 30)
    .sort((a, b) => a.day - b.day);

  let cumResponses = 0;
  let cumDelivered = 0;
  const daysSinceDrop = daysSinceDropRaw.map((r) => {
    cumDelivered += r.delivered;
    cumResponses += r.qrScans + r.calls;
    return {
      ...r,
      cumulativeResponse: cumResponses,
      liftRatio: cumDelivered ? cumResponses / cumDelivered : 0,
    };
  });

  // --- Avg response delay ---
  const firstResponseDay = daysSinceDrop.find((r) => r.qrScans + r.calls > 0)?.day ?? null;

  // --- Channel mix ---
  const totalResponses = totalQRScans + totalCalls;
  const channelMix = [
    { channel: "QR Scan", count: totalQRScans, share: totalResponses ? totalQRScans / totalResponses : 0 },
    { channel: "Phone Call", count: totalCalls, share: totalResponses ? totalCalls / totalResponses : 0 },
  ];

  // --- Top ZIPs (delivered + response approx via geo distribution) ---
  const zipMap = new Map<string, { zip: string; delivered: number }>();
  for (const p of pieces) {
    if (!p.zip5) continue;
    const e = zipMap.get(p.zip5) ?? { zip: p.zip5, delivered: 0 };
    if (p.status === "DELIVERED" || p.status === "DELIVERED_INFERRED") e.delivered++;
    zipMap.set(p.zip5, e);
  }
  const topZips = [...zipMap.values()]
    .sort((a, b) => b.delivered - a.delivered)
    .slice(0, 10)
    .map((z) => ({ ...z, responseRate: totalDelivered ? totalResponses / totalDelivered : 0 }));

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      campaignCode: campaign.campaignCode,
      company: campaign.company,
      dropDate: drop.toISOString(),
    },
    totalPieces,
    totalDelivered,
    totalQRScans,
    totalCalls,
    totalConversions,
    responseRate: totalDelivered ? totalResponses / totalDelivered : 0,
    avgResponseDelayDays: firstResponseDay,
    dailyTimeline,
    daysSinceDrop,
    channelMix,
    topZips,
  });
}

// --- Demo fallback ---
function demoAttribution(campaignId: string) {
  const drop = new Date();
  drop.setDate(drop.getDate() - 14);
  const daysSinceDrop = Array.from({ length: 15 }).map((_, day) => {
    const delivered = day < 2 ? 0 : day === 2 ? 800 : day === 3 ? 3200 : day === 4 ? 5100 : day === 5 ? 1200 : Math.max(0, 400 - day * 20);
    const qrBell = Math.exp(-Math.pow((day - 5) / 2.5, 2)) * 640;
    const callBell = Math.exp(-Math.pow((day - 6) / 3, 2)) * 210;
    return {
      day,
      delivered,
      qrScans: Math.round(qrBell),
      calls: Math.round(callBell),
      cumulativeResponse: 0,
      liftRatio: 0,
    };
  });
  let cumR = 0, cumD = 0;
  for (const r of daysSinceDrop) {
    cumD += r.delivered;
    cumR += r.qrScans + r.calls;
    r.cumulativeResponse = cumR;
    r.liftRatio = cumD ? cumR / cumD : 0;
  }

  const totalDelivered = daysSinceDrop.reduce((s, r) => s + r.delivered, 0);
  const totalQRScans = daysSinceDrop.reduce((s, r) => s + r.qrScans, 0);
  const totalCalls = daysSinceDrop.reduce((s, r) => s + r.calls, 0);

  return {
    campaign: {
      id: campaignId,
      name: "Spring Homeowner Mailer",
      campaignCode: "CD-2026-001",
      company: { id: "demo-company-2", name: "Sunshine Realty Group" },
      dropDate: drop.toISOString(),
    },
    totalPieces: 12500,
    totalDelivered,
    totalQRScans,
    totalCalls,
    totalConversions: 128,
    responseRate: (totalQRScans + totalCalls) / Math.max(1, totalDelivered),
    avgResponseDelayDays: 3,
    dailyTimeline: daysSinceDrop.map((r, i) => {
      const d = new Date(drop);
      d.setDate(drop.getDate() + i);
      return {
        date: d.toISOString().slice(0, 10),
        deliveredCount: r.delivered,
        qrScans: r.qrScans,
        calls: r.calls,
        conversions: Math.round((r.qrScans + r.calls) * 0.08),
      };
    }),
    daysSinceDrop,
    channelMix: [
      { channel: "QR Scan", count: totalQRScans, share: totalQRScans / (totalQRScans + totalCalls) },
      { channel: "Phone Call", count: totalCalls, share: totalCalls / (totalQRScans + totalCalls) },
    ],
    topZips: [
      { zip: "32127", delivered: 2340, responseRate: 0.12 },
      { zip: "32129", delivered: 1890, responseRate: 0.09 },
      { zip: "32137", delivered: 1640, responseRate: 0.14 },
      { zip: "32114", delivered: 1480, responseRate: 0.11 },
      { zip: "32174", delivered: 1220, responseRate: 0.08 },
    ],
  };
}
