"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Home,
  PackageSearch,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PieceDetailModal } from "@/components/mail-tracking/piece-detail-modal";

interface MailPieceRow {
  id: string;
  imb: string;
  recipientName: string | null;
  city: string | null;
  state: string | null;
  zip5: string | null;
  status: string;
  expectedInHomeDate: string | null;
  firstScanAt: string | null;
  deliveredAt: string | null;
  daysToDeliver: number | null;
  isSeed: boolean;
}

interface MailTrackingData {
  campaignId: string;
  totalQuantity: number;
  pieceCount: number;
  statusCounts: Record<string, number>;
  deliveryRate: number;
  avgDaysToDeliver: number;
  deliveryCurve: { date: string; delivered: number }[];
  operationBreakdown: { operation: string; count: number }[];
  pieces: MailPieceRow[];
  batches: Array<{
    id: string;
    batchName: string;
    quantity: number;
    dropDate: string;
    expectedInHomeStart: string | null;
    expectedInHomeEnd: string | null;
    deliveredCount: number;
    status: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-700",
  DELIVERED_INFERRED: "bg-teal-100 text-teal-700",
  OUT_FOR_DELIVERY: "bg-blue-100 text-blue-700",
  IN_TRANSIT: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-slate-100 text-slate-700",
  PENDING: "bg-gray-100 text-gray-600",
  UNDELIVERABLE: "bg-rose-100 text-rose-700",
};

export default function MailTrackingPage() {
  const [data, setData] = useState<MailTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [campaignId] = useState("camp-1"); // TODO: pull from selector
  const [openPieceId, setOpenPieceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/mail-tracking/${campaignId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Loading mail tracking…
      </div>
    );
  }

  const delivered =
    (data.statusCounts.DELIVERED ?? 0) + (data.statusCounts.DELIVERED_INFERRED ?? 0);
  const inTransit =
    (data.statusCounts.IN_TRANSIT ?? 0) +
    (data.statusCounts.ACCEPTED ?? 0) +
    (data.statusCounts.PENDING ?? 0);
  const ofd = data.statusCounts.OUT_FOR_DELIVERY ?? 0;
  const undeliv = data.statusCounts.UNDELIVERABLE ?? 0;

  const filtered = data.pieces.filter((p) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      p.imb.includes(q) ||
      (p.recipientName ?? "").toLowerCase().includes(q) ||
      (p.zip5 ?? "").includes(q) ||
      (p.city ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mail Tracking</h1>
            <p className="text-sm text-gray-500">
              USPS IV-MTR barcode tracking &middot; IMb-level delivery visibility
            </p>
          </div>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700">Live via IV-MTR</Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Delivery Rate"
          value={data.deliveryRate * 100}
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-100"
          format="percent"
          helpText={`${delivered.toLocaleString()} of ${data.totalQuantity.toLocaleString()} pieces scanned as delivered`}
        />
        <KPICard
          label="In Transit"
          value={inTransit}
          icon={Truck}
          iconColor="text-amber-600 bg-amber-100"
          helpText="Pieces accepted and moving through USPS network"
        />
        <KPICard
          label="Out For Delivery"
          value={ofd}
          icon={Home}
          iconColor="text-blue-600 bg-blue-100"
          helpText="On carrier route today — expect delivery scan within 24h"
        />
        <KPICard
          label="Avg Days to Deliver"
          value={Number(data.avgDaysToDeliver.toFixed(1))}
          icon={Clock}
          iconColor="text-indigo-600 bg-indigo-100"
          helpText="From first acceptance scan to final delivery scan"
        />
      </div>

      {/* Delivery curve + operation funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Delivery Curve</CardTitle>
            <p className="text-sm text-gray-500">Pieces delivered per day</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.deliveryCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                <Line
                  type="monotone"
                  dataKey="delivered"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scan Funnel</CardTitle>
            <p className="text-sm text-gray-500">Pieces that hit each stage</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.operationBreakdown.map((o) => ({
                  ...o,
                  label: o.operation.replace(/_/g, " "),
                }))}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={130} />
                <RTooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Batches */}
      <Card>
        <CardHeader>
          <CardTitle>Mail Drops</CardTitle>
          <p className="text-sm text-gray-500">Batch-level rollup with in-home windows</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b">
                <tr>
                  <th className="py-2">Batch</th>
                  <th>Drop Date</th>
                  <th>Expected In-Home</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Delivered</th>
                  <th className="text-right">Delivery %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{b.batchName}</td>
                    <td>{new Date(b.dropDate).toLocaleDateString()}</td>
                    <td className="text-gray-600">
                      {b.expectedInHomeStart
                        ? `${new Date(b.expectedInHomeStart).toLocaleDateString()} – ${
                            b.expectedInHomeEnd
                              ? new Date(b.expectedInHomeEnd).toLocaleDateString()
                              : "?"
                          }`
                        : "—"}
                    </td>
                    <td className="text-right">{b.quantity.toLocaleString()}</td>
                    <td className="text-right">{b.deliveredCount.toLocaleString()}</td>
                    <td className="text-right">
                      {b.quantity ? ((b.deliveredCount / b.quantity) * 100).toFixed(1) : "0.0"}%
                    </td>
                    <td>
                      <Badge className="bg-slate-100 text-slate-700 capitalize">
                        {b.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Undeliverable alert */}
      {undeliv > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <div className="text-sm">
                <div className="font-semibold text-rose-900">
                  {undeliv.toLocaleString()} undeliverable pieces
                </div>
                <div className="text-rose-700">
                  USPS reported UAA scans (bad address, vacant, refused). Export the list to
                  update your address hygiene.
                </div>
              </div>
            </div>
            <a
              href={`/api/mail-pieces/undeliverable?campaignId=${campaignId}`}
              download
              className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-rose-700 hover:text-rose-900 bg-white border border-rose-200 rounded px-3 py-1.5"
            >
              Download CSV
            </a>
          </CardContent>
        </Card>
      )}

      {/* Piece-level search */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Piece-Level Tracking</CardTitle>
            <p className="text-sm text-gray-500">
              Look up any mailpiece by IMb, recipient, city or ZIP
            </p>
          </div>
          <div className="w-72">
            <Input
              placeholder="Search IMb / name / ZIP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b">
                <tr>
                  <th className="py-2">IMb</th>
                  <th>Recipient</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>First Scan</th>
                  <th>Delivered</th>
                  <th className="text-right">Days</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setOpenPieceId(p.id)}
                    className="border-b last:border-0 hover:bg-brand-50 cursor-pointer"
                  >
                    <td className="py-2 font-mono text-xs text-gray-700">
                      {p.isSeed && (
                        <Badge className="mr-2 bg-indigo-100 text-indigo-700 text-[10px]">
                          SEED
                        </Badge>
                      )}
                      {p.imb.slice(0, 20)}…
                    </td>
                    <td>{p.recipientName ?? "—"}</td>
                    <td className="text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {p.city}, {p.state} {p.zip5}
                      </div>
                    </td>
                    <td>
                      <Badge className={STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}>
                        {p.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="text-gray-600 text-xs">
                      {p.firstScanAt ? new Date(p.firstScanAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-gray-600 text-xs">
                      {p.deliveredAt ? new Date(p.deliveredAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-right">{p.daysToDeliver ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div className="py-3 text-center text-xs text-gray-500">
                Showing first 100 of {filtered.length.toLocaleString()} pieces — refine your
                search or export to see more.
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4" />
              Piece data updates every 15 min from USPS IV-MTR feed
            </div>
            <a
              href={`/api/mail-pieces/undeliverable?campaignId=${campaignId}`}
              download
              className="text-brand-600 hover:underline font-medium"
            >
              Export list (CSV)
            </a>
          </div>
        </CardContent>
      </Card>

      <PieceDetailModal pieceId={openPieceId} onClose={() => setOpenPieceId(null)} />
    </div>
  );
}
