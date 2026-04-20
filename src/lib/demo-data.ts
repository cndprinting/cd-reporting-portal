// Demo session data for running without a database
import type { SessionUser } from "./auth";

export const demoUser: SessionUser = {
  id: "demo-user-1",
  email: "demo@cdprinting.com",
  name: "Sarah Johnson",
  role: "ADMIN",
  companyId: "demo-company-1",
  companyName: "C&D Printing Demo Account",
};

export const demoCompanies = [
  {
    id: "demo-company-1",
    name: "C&D Printing Demo Account",
    slug: "cd-printing-demo",
    industry: "Printing & Direct Mail",
    isActive: true,
  },
  {
    id: "demo-company-2",
    name: "Sunshine Realty Group",
    slug: "sunshine-realty",
    industry: "Real Estate",
    isActive: true,
  },
  {
    id: "demo-company-3",
    name: "Palm Coast Insurance",
    slug: "palm-coast-insurance",
    industry: "Insurance",
    isActive: true,
  },
];

export const demoCampaigns = [
  {
    id: "camp-1",
    name: "Spring Homeowner Mailer",
    campaignCode: "CD-2026-001",
    status: "LIVE" as const,
    companyId: "demo-company-1",
    description: "Targeted spring mailer campaign for homeowners in the 33401-33499 zip code range.",
    destinationUrl: "https://cdprinting.com/spring-offer",
    setupDate: "2026-02-15",
    startDate: "2026-03-01",
    channels: ["MAIL_TRACKING", "CALL_TRACKING", "GOOGLE_ADS", "FACEBOOK_ADS", "QR_CODES"],
  },
  {
    id: "camp-2",
    name: "South Florida Prospecting",
    campaignCode: "CD-2026-002",
    status: "LIVE" as const,
    companyId: "demo-company-1",
    description: "Multi-channel prospecting campaign targeting South Florida businesses.",
    destinationUrl: "https://cdprinting.com/south-florida",
    setupDate: "2026-01-20",
    startDate: "2026-02-01",
    channels: ["MAIL_TRACKING", "GOOGLE_ADS", "FACEBOOK_ADS", "BEHAVIORAL_ADS", "GMAIL_ADS"],
  },
  {
    id: "camp-3",
    name: "Investor Lead Gen Q2",
    campaignCode: "CD-2026-003",
    status: "PAUSED" as const,
    companyId: "demo-company-2",
    description: "Lead generation campaign targeting real estate investors for Q2.",
    destinationUrl: "https://sunshinerealty.com/investors",
    setupDate: "2026-03-01",
    startDate: "2026-03-15",
    channels: ["MAIL_TRACKING", "CALL_TRACKING", "GOOGLE_ADS", "YOUTUBE_ADS"],
  },
  {
    id: "camp-4",
    name: "Geo-Targeted Retargeting Push",
    campaignCode: "CD-2026-004",
    status: "COMPLETED" as const,
    companyId: "demo-company-2",
    description: "Retargeting campaign for website visitors in specific geographic areas.",
    destinationUrl: "https://sunshinerealty.com/retarget",
    setupDate: "2025-12-01",
    startDate: "2026-01-01",
    endDate: "2026-02-28",
    channels: ["BEHAVIORAL_ADS", "FACEBOOK_ADS", "GMAIL_ADS", "YOUTUBE_ADS"],
  },
  {
    id: "camp-5",
    name: "Luxury Home Seller Campaign",
    campaignCode: "CD-2026-005",
    status: "LIVE" as const,
    companyId: "demo-company-3",
    description: "Premium direct mail and digital campaign targeting luxury home sellers.",
    destinationUrl: "https://palmcoastins.com/luxury",
    setupDate: "2026-03-10",
    startDate: "2026-03-20",
    channels: ["MAIL_TRACKING", "CALL_TRACKING", "GOOGLE_ADS", "FACEBOOK_ADS", "BEHAVIORAL_ADS", "QR_CODES"],
  },
];

function generateDailyMetrics(campaignId: string, channel: string, days: number, baseImpressions: number, baseCtr: number) {
  const metrics = [];
  const today = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const variance = 0.7 + Math.random() * 0.6;
    const impressions = Math.round(baseImpressions * variance);
    const clicks = Math.round(impressions * baseCtr * (0.8 + Math.random() * 0.4));
    const leads = Math.round(clicks * 0.08 * (0.5 + Math.random()));
    const calls = channel === "CALL_TRACKING" ? Math.round(3 + Math.random() * 12) : Math.round(leads * 0.3);
    const qualifiedCalls = Math.round(calls * 0.6);
    const piecesDelivered = channel === "MAIL_TRACKING" ? Math.round(50 + Math.random() * 200) : 0;
    const qrScans = channel === "QR_CODES" ? Math.round(5 + Math.random() * 30) : 0;

    metrics.push({
      campaignId,
      channel,
      date: date.toISOString().split("T")[0],
      impressions,
      clicks,
      leads,
      calls,
      qualifiedCalls,
      conversions: Math.round(leads * 0.15),
      spend: Math.round(impressions * 0.012 * 100) / 100,
      piecesDelivered,
      qrScans,
    });
  }
  return metrics;
}

export function getDemoMetrics() {
  const allMetrics: ReturnType<typeof generateDailyMetrics> = [];

  const channelConfigs: Record<string, { baseImpressions: number; baseCtr: number }> = {
    MAIL_TRACKING: { baseImpressions: 0, baseCtr: 0 },
    CALL_TRACKING: { baseImpressions: 0, baseCtr: 0 },
    GOOGLE_ADS: { baseImpressions: 8500, baseCtr: 0.035 },
    FACEBOOK_ADS: { baseImpressions: 12000, baseCtr: 0.025 },
    BEHAVIORAL_ADS: { baseImpressions: 15000, baseCtr: 0.008 },
    GMAIL_ADS: { baseImpressions: 6000, baseCtr: 0.02 },
    YOUTUBE_ADS: { baseImpressions: 20000, baseCtr: 0.005 },
    QR_CODES: { baseImpressions: 0, baseCtr: 0 },
  };

  for (const campaign of demoCampaigns) {
    const days = campaign.status === "COMPLETED" ? 60 : 35;
    for (const ch of campaign.channels) {
      const config = channelConfigs[ch] || { baseImpressions: 5000, baseCtr: 0.02 };
      if (ch === "MAIL_TRACKING") {
        allMetrics.push(...generateDailyMetrics(campaign.id, ch, days, 0, 0).map(m => ({
          ...m,
          piecesDelivered: Math.round(80 + Math.random() * 300),
        })));
      } else if (ch === "CALL_TRACKING") {
        allMetrics.push(...generateDailyMetrics(campaign.id, ch, days, 0, 0));
      } else if (ch === "QR_CODES") {
        allMetrics.push(...generateDailyMetrics(campaign.id, ch, days, 0, 0).map(m => ({
          ...m,
          qrScans: Math.round(5 + Math.random() * 25),
        })));
      } else {
        allMetrics.push(...generateDailyMetrics(campaign.id, ch, days, config.baseImpressions, config.baseCtr));
      }
    }
  }

  return allMetrics;
}

export function getAggregatedKPIs(campaignIds?: string[]) {
  const metrics = getDemoMetrics();
  const filtered = campaignIds
    ? metrics.filter(m => campaignIds.includes(m.campaignId))
    : metrics;

  const totals = filtered.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      leads: acc.leads + m.leads,
      calls: acc.calls + m.calls,
      qualifiedCalls: acc.qualifiedCalls + m.qualifiedCalls,
      conversions: acc.conversions + m.conversions,
      spend: acc.spend + m.spend,
      piecesDelivered: acc.piecesDelivered + m.piecesDelivered,
      qrScans: acc.qrScans + m.qrScans,
    }),
    { impressions: 0, clicks: 0, leads: 0, calls: 0, qualifiedCalls: 0, conversions: 0, spend: 0, piecesDelivered: 0, qrScans: 0 }
  );

  return totals;
}

export function getChannelKPIs(campaignIds?: string[]) {
  const metrics = getDemoMetrics();
  const filtered = campaignIds
    ? metrics.filter(m => campaignIds.includes(m.campaignId))
    : metrics;

  const byChannel: Record<string, { impressions: number; clicks: number; leads: number; calls: number; qualifiedCalls: number; piecesDelivered: number; qrScans: number; spend: number }> = {};

  for (const m of filtered) {
    if (!byChannel[m.channel]) {
      byChannel[m.channel] = { impressions: 0, clicks: 0, leads: 0, calls: 0, qualifiedCalls: 0, piecesDelivered: 0, qrScans: 0, spend: 0 };
    }
    byChannel[m.channel].impressions += m.impressions;
    byChannel[m.channel].clicks += m.clicks;
    byChannel[m.channel].leads += m.leads;
    byChannel[m.channel].calls += m.calls;
    byChannel[m.channel].qualifiedCalls += m.qualifiedCalls;
    byChannel[m.channel].piecesDelivered += m.piecesDelivered;
    byChannel[m.channel].qrScans += m.qrScans;
    byChannel[m.channel].spend += m.spend;
  }

  return byChannel;
}

export function getTimeSeriesData(campaignIds?: string[]) {
  const metrics = getDemoMetrics();
  const filtered = campaignIds
    ? metrics.filter(m => campaignIds.includes(m.campaignId))
    : metrics;

  const byDate: Record<string, { date: string; impressions: number; clicks: number; leads: number; calls: number; spend: number }> = {};

  for (const m of filtered) {
    if (!byDate[m.date]) {
      byDate[m.date] = { date: m.date, impressions: 0, clicks: 0, leads: 0, calls: 0, spend: 0 };
    }
    byDate[m.date].impressions += m.impressions;
    byDate[m.date].clicks += m.clicks;
    byDate[m.date].leads += m.leads;
    byDate[m.date].calls += m.calls;
    byDate[m.date].spend += m.spend;
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

// ---- Mail-tracking demo (for MAIL_TRACKING page before IV-MTR is live) ----

const DEMO_STATUSES = [
  "DELIVERED",
  "DELIVERED",
  "DELIVERED",
  "DELIVERED",
  "OUT_FOR_DELIVERY",
  "IN_TRANSIT",
  "IN_TRANSIT",
  "ACCEPTED",
  "UNDELIVERABLE",
  "DELIVERED_INFERRED",
] as const;

const DEMO_CITIES = [
  ["Port Orange", "FL", "32127"],
  ["Daytona Beach", "FL", "32114"],
  ["Ormond Beach", "FL", "32174"],
  ["Palm Coast", "FL", "32137"],
  ["New Smyrna Beach", "FL", "32168"],
  ["DeLand", "FL", "32720"],
];

export function getDemoMailTracking(campaignId: string) {
  const total = 12500;
  const delivered = 10420;
  const inTransit = 1450;
  const ofd = 380;
  const undeliverable = 190;
  const inferred = 60;

  // Delivery curve — daily deliveries over last 14 days, peaks mid-window
  const today = new Date();
  const deliveryCurve = Array.from({ length: 14 }).map((_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (13 - i));
    const bell = Math.exp(-Math.pow((i - 7) / 3, 2));
    return {
      date: day.toISOString().slice(0, 10),
      delivered: Math.round(delivered * bell * 0.18),
    };
  });

  const pieces = Array.from({ length: 60 }).map((_, i) => {
    const status = DEMO_STATUSES[i % DEMO_STATUSES.length];
    const [city, state, zip] = DEMO_CITIES[i % DEMO_CITIES.length];
    const firstScan = new Date(today);
    firstScan.setDate(today.getDate() - (14 - (i % 14)));
    const delivDate =
      status === "DELIVERED" || status === "DELIVERED_INFERRED"
        ? new Date(firstScan.getTime() + (2 + (i % 3)) * 86400000)
        : null;
    return {
      id: `demo-piece-${i}`,
      imb: `0012345${String(600000000 + i).padStart(9, "0")}${zip}0000`,
      recipientName: `Demo Recipient ${i + 1}`,
      city,
      state,
      zip5: zip,
      status,
      expectedInHomeDate: firstScan.toISOString(),
      firstScanAt: firstScan.toISOString(),
      deliveredAt: delivDate ? delivDate.toISOString() : null,
      daysToDeliver: delivDate ? 2 + (i % 3) : null,
      isSeed: i < 3,
    };
  });

  return {
    campaignId,
    totalQuantity: total,
    pieceCount: total,
    statusCounts: {
      DELIVERED: delivered,
      IN_TRANSIT: inTransit,
      OUT_FOR_DELIVERY: ofd,
      UNDELIVERABLE: undeliverable,
      DELIVERED_INFERRED: inferred,
    },
    deliveryRate: delivered / total,
    avgDaysToDeliver: 2.8,
    deliveryCurve,
    operationBreakdown: [
      { operation: "ORIGIN_ACCEPTANCE", count: total },
      { operation: "ORIGIN_PROCESSED", count: total },
      { operation: "IN_TRANSIT", count: 11800 },
      { operation: "DESTINATION_PROCESSED", count: 11200 },
      { operation: "OUT_FOR_DELIVERY", count: 10800 },
      { operation: "DELIVERED", count: delivered },
    ],
    pieces,
    batches: [
      {
        id: "demo-batch-1",
        campaignId,
        batchName: "Drop 1 — Volusia County",
        quantity: 7500,
        dropDate: new Date(today.getTime() - 14 * 86400000).toISOString(),
        expectedInHomeStart: new Date(today.getTime() - 11 * 86400000).toISOString(),
        expectedInHomeEnd: new Date(today.getTime() - 8 * 86400000).toISOString(),
        deliveredCount: 6800,
        status: "delivered",
      },
      {
        id: "demo-batch-2",
        campaignId,
        batchName: "Drop 2 — Flagler County",
        quantity: 5000,
        dropDate: new Date(today.getTime() - 8 * 86400000).toISOString(),
        expectedInHomeStart: new Date(today.getTime() - 5 * 86400000).toISOString(),
        expectedInHomeEnd: new Date(today.getTime() - 2 * 86400000).toISOString(),
        deliveredCount: 3620,
        status: "in_progress",
      },
    ],
  };
}
