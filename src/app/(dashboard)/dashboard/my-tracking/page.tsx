"use client";

/**
 * Customer-facing tracking view — scoped automatically to the logged-in
 * user's Company via /api/mailers/:companyId/tracking.
 * Admins can use the same page but should prefer /dashboard/mail-tracking.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Mail, CheckCircle2, Truck, Home, AlertTriangle, MapPin } from "lucide-react";

// Lazy-load the choropleth (ships ~40KB gzipped of us-atlas geometry + d3-geo).
const UsStateHeatmap = dynamic(
  () => import("@/components/tracking/us-state-heatmap").then((m) => m.UsStateHeatmap),
  { ssr: false, loading: () => <div className="h-80 flex items-center justify-center text-sm text-gray-400">Loading map…</div> },
);
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TrackingData {
  companyId: string;
  totals: { pieces: number; delivered: number; deliveryRate: number };
  statusCounts: Record<string, number>;
  perState: Array<{ state: string; total: number; delivered: number }>;
  perCampaign: Array<{
    campaignId: string;
    name: string;
    campaignCode: string;
    total: number;
    delivered: number;
  }>;
  perMailerId: Array<{ mid: string | null; count: number }>;
  batches: Array<{
    id: string;
    batchName: string;
    quantity: number;
    dropDate: string;
    deliveredCount: number;
    status: string;
    mailerId: string | null;
    campaign: { id: string; name: string; campaignCode: string };
  }>;
}

export default function MyTrackingPage() {
  const [data, setData] = useState<TrackingData | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        const cid = d?.user?.companyId ?? d?.companyId ?? null;
        setCompanyId(cid);
        if (!cid) return Promise.resolve({ json: () => Promise.resolve(null) } as unknown as Response);
        return fetch(`/api/mailers/${cid}/tracking`);
      })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || !companyId) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Loading your mail tracking…
      </div>
    );
  }

  const { totals, statusCounts } = data;
  const ofd = statusCounts.OUT_FOR_DELIVERY ?? 0;
  // "In Transit" = pieces with USPS scan activity but not yet delivered.
  // PENDING pieces (no scan yet) are excluded — they're awaiting USPS pickup,
  // not actually moving through the network.
  const inTransit =
    (statusCounts.IN_TRANSIT ?? 0) + (statusCounts.ACCEPTED ?? 0);
  const pending = statusCounts.PENDING ?? 0;
  const undeliv = statusCounts.UNDELIVERABLE ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Mail Tracking</h1>
          <p className="text-sm text-gray-500">
            USPS delivery tracking across all your campaigns
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Delivery Rate"
          value={totals.deliveryRate * 100}
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-100"
          format="percent"
          helpText={`${totals.delivered.toLocaleString()} of ${totals.pieces.toLocaleString()} pieces delivered`}
        />
        <KPICard
          label="In Transit"
          value={inTransit}
          icon={Truck}
          iconColor="text-amber-600 bg-amber-100"
          helpText={
            pending > 0
              ? `Moving through USPS · ${pending.toLocaleString()} also awaiting first scan`
              : "Accepted and moving through USPS"
          }
        />
        <KPICard
          label="Out For Delivery"
          value={ofd}
          icon={Home}
          iconColor="text-blue-600 bg-blue-100"
        />
        <KPICard
          label="Total Pieces"
          value={totals.pieces}
          icon={Mail}
          iconColor="text-slate-600 bg-slate-100"
          helpText="Across all your campaigns"
        />
      </div>

      {undeliv > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <div className="text-sm">
              <div className="font-semibold text-rose-900">
                {undeliv.toLocaleString()} undeliverable pieces
              </div>
              <div className="text-rose-700">
                Contact your C&amp;D account manager for an address cleanup report.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.perState && data.perState.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-600" />
              <CardTitle>Delivery Heat Map</CardTitle>
            </div>
            <p className="text-sm text-gray-500">
              Where your mail landed, by state — derived from each piece&apos;s USPS routing code
            </p>
          </CardHeader>
          <CardContent>
            <UsStateHeatmap data={data.perState} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Campaigns</CardTitle>
          <p className="text-sm text-gray-500">Delivery performance per campaign</p>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 border-b">
              <tr>
                <th className="py-2">Campaign</th>
                <th className="text-right">Pieces</th>
                <th className="text-right">Delivered</th>
                <th className="text-right">Delivery %</th>
              </tr>
            </thead>
            <tbody>
              {data.perCampaign.map((c) => (
                <tr key={c.campaignId} className="border-b last:border-0">
                  <td className="py-3">
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.campaignCode && (
                      <div className="text-xs text-stone font-mono">{c.campaignCode}</div>
                    )}
                  </td>
                  <td className="text-right">{c.total.toLocaleString()}</td>
                  <td className="text-right">{c.delivered.toLocaleString()}</td>
                  <td className="text-right">
                    <Badge
                      className={
                        c.total && c.delivered / c.total >= 0.9
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {c.total ? ((c.delivered / c.total) * 100).toFixed(1) : "0.0"}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Mail Drops</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 border-b">
              <tr>
                <th className="py-2">Batch</th>
                <th>Campaign</th>
                <th>Drop Date</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Delivered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.batches.slice(0, 15).map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{b.batchName}</td>
                  <td className="text-gray-600 text-xs">
                    {b.campaign.campaignCode} — {b.campaign.name}
                  </td>
                  <td>{new Date(b.dropDate).toLocaleDateString()}</td>
                  <td className="text-right">{b.quantity.toLocaleString()}</td>
                  <td className="text-right">{b.deliveredCount.toLocaleString()}</td>
                  <td>
                    <Badge className="bg-slate-100 text-slate-700 capitalize">
                      {b.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
