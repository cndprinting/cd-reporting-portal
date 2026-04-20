"use client";

import { useEffect, useState } from "react";
import {
  Zap,
  QrCode,
  Phone,
  Mail,
  TrendingUp,
  MapPin,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface AttributionData {
  campaign: {
    id: string;
    name: string;
    campaignCode: string;
    company: { id: string; name: string };
    dropDate: string;
  };
  totalPieces: number;
  totalDelivered: number;
  totalQRScans: number;
  totalCalls: number;
  totalConversions: number;
  responseRate: number;
  avgResponseDelayDays: number | null;
  dailyTimeline: Array<{
    date: string;
    deliveredCount: number;
    qrScans: number;
    calls: number;
    conversions: number;
  }>;
  daysSinceDrop: Array<{
    day: number;
    delivered: number;
    qrScans: number;
    calls: number;
    cumulativeResponse: number;
    liftRatio: number;
  }>;
  channelMix: Array<{ channel: string; count: number; share: number }>;
  topZips: Array<{ zip: string; delivered: number; responseRate: number }>;
}

const COLORS = { mail: "#10b981", qr: "#0ea5e9", call: "#f59e0b", conv: "#8b5cf6" };

export default function AttributionPage() {
  const [data, setData] = useState<AttributionData | null>(null);
  const [campaignId, setCampaignId] = useState("camp-1");
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; campaignCode: string }>>([]);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? d ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/attribution/${campaignId}`).then((r) => r.json()).then(setData);
  }, [campaignId]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Loading cross-channel attribution…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-violet-100 text-violet-600">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cross-Channel Attribution</h1>
            <p className="text-sm text-gray-500">
              How direct mail, QR scans, and phone calls work together for one campaign
            </p>
          </div>
        </div>
        <select
          className="h-9 rounded-md border border-gray-300 px-3 text-sm min-w-[280px]"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        >
          {(campaigns.length ? campaigns : [{ id: "camp-1", name: "Spring Homeowner Mailer", campaignCode: "CD-2026-001" }]).map(
            (c) => (
              <option key={c.id} value={c.id}>
                {c.campaignCode} — {c.name}
              </option>
            ),
          )}
        </select>
      </div>

      {/* Campaign context strip */}
      <Card className="bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200">
        <CardContent className="py-4 flex items-center justify-between text-sm">
          <div>
            <div className="font-semibold text-gray-900">{data.campaign.name}</div>
            <div className="text-gray-600">
              {data.campaign.company.name} &middot; Dropped{" "}
              <span className="font-medium">
                {new Date(data.campaign.dropDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-violet-700">
              {(data.responseRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Response rate across all channels</div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Pieces Delivered"
          value={data.totalDelivered}
          icon={Mail}
          iconColor="text-emerald-600 bg-emerald-100"
        />
        <KPICard
          label="QR Scans"
          value={data.totalQRScans}
          icon={QrCode}
          iconColor="text-sky-600 bg-sky-100"
          helpText="Household scanned QR code on mailer"
        />
        <KPICard
          label="Phone Calls"
          value={data.totalCalls}
          icon={Phone}
          iconColor="text-amber-600 bg-amber-100"
          helpText="Tracked calls from campaign number"
        />
        <KPICard
          label="Avg Response Delay"
          value={data.avgResponseDelayDays ?? 0}
          icon={Clock}
          iconColor="text-violet-600 bg-violet-100"
          helpText="Days from first delivery scan to first response"
        />
      </div>

      {/* Days-since-drop — the money chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-600" />
            Response Curve — Days Since Drop
          </CardTitle>
          <p className="text-sm text-gray-500">
            Mail lands, then QR scans spike, then calls follow. This is the story you sell.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={data.daysSinceDrop}>
              <defs>
                <linearGradient id="gMail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.mail} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={COLORS.mail} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gQR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.qr} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={COLORS.qr} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gCall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.call} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={COLORS.call} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                label={{ value: "Days since drop", position: "insideBottom", offset: -4, fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Legend />
              <Area type="monotone" dataKey="delivered" name="Mail delivered" stroke={COLORS.mail} fill="url(#gMail)" strokeWidth={2} />
              <Area type="monotone" dataKey="qrScans" name="QR scans" stroke={COLORS.qr} fill="url(#gQR)" strokeWidth={2} />
              <Area type="monotone" dataKey="calls" name="Phone calls" stroke={COLORS.call} fill="url(#gCall)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative lift */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cumulative Response Lift</CardTitle>
            <p className="text-sm text-gray-500">
              Total responses as a % of pieces delivered, growing over time
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.daysSinceDrop}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                />
                <RTooltip formatter={(v) => `${(Number(v) * 100).toFixed(2)}%`} />
                <Line
                  type="monotone"
                  dataKey="liftRatio"
                  stroke={COLORS.conv}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  name="Response rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel mix pie */}
        <Card>
          <CardHeader>
            <CardTitle>Response Mix</CardTitle>
            <p className="text-sm text-gray-500">Where the responses came from</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.channelMix}
                  dataKey="count"
                  nameKey="channel"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  label={(e: { name?: string; percent?: number }) =>
                    `${e.name ?? ""} ${((e.percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data.channelMix.map((c, i) => (
                    <Cell key={c.channel} fill={i === 0 ? COLORS.qr : COLORS.call} />
                  ))}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top ZIPs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            Top ZIPs by Delivered Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.topZips} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="zip" tick={{ fontSize: 11 }} width={80} />
              <RTooltip />
              <Bar dataKey="delivered" fill={COLORS.mail} radius={[0, 4, 4, 0]} name="Delivered" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* The narrative card */}
      <Card className="bg-gradient-to-br from-violet-50 to-blue-50 border-violet-200">
        <CardContent className="py-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-violet-600" />
            </div>
            <div className="text-sm text-gray-800 space-y-2">
              <div className="font-semibold text-gray-900 text-base">The campaign story</div>
              <p>
                <strong>{data.totalDelivered.toLocaleString()}</strong> pieces were delivered
                over the {data.daysSinceDrop.length}-day window.
                {data.avgResponseDelayDays != null && (
                  <>
                    {" "}The first household response landed{" "}
                    <strong>{data.avgResponseDelayDays} days</strong> after the first delivery scan.
                  </>
                )}
              </p>
              <p>
                <strong>{data.totalQRScans.toLocaleString()} QR scans</strong> and{" "}
                <strong>{data.totalCalls.toLocaleString()} phone calls</strong> were attributed to
                this campaign, producing a blended response rate of{" "}
                <strong>{(data.responseRate * 100).toFixed(2)}%</strong> — which is the real
                number your customer cares about.
              </p>
              <p className="text-xs text-gray-600 italic">
                This is the view Accutrace doesn&apos;t offer. You won it because the mail scan
                data, QR scans, and call logs all live in the same database.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
