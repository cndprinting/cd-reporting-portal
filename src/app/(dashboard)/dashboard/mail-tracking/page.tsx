"use client";

/**
 * Mail Tracking — multi-customer rollup view.
 *
 * Layout (top to bottom):
 *   1. Header + customer scope selector
 *   2. Top KPI strip (only meaningful metrics for current data)
 *   3. Per-customer rollup table (admin "All customers" view) OR campaign list (single-customer)
 *   4. Scan funnel + recent scan feed (live activity proof)
 *   5. Pieces table (filterable)
 */

import { useEffect, useState } from "react";
import { Mail, CheckCircle2, MapPin, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieceDetailModal } from "@/components/mail-tracking/piece-detail-modal";

interface PieceRow {
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
  company?: { id: string; name: string } | null;
}

interface CustomerRollup {
  id: string;
  name: string;
  pieceCount: number;
  scanCount: number;
  acceptedCount: number;
  deliveredCount: number;
  lastScanAt: string | null;
}

interface RecentScan {
  id: string;
  scanDatetime: string;
  operation: string;
  operationDesc: string | null;
  facilityCity: string | null;
  facilityState: string | null;
  imb?: string;
  recipientName?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  companyId?: string;
  companyName?: string;
}

interface OverviewData {
  companyId: string | null;
  totalQuantity: number;
  pieceCount: number;
  archivedCount?: number;
  scanCount: number;
  statusCounts: Record<string, number>;
  deliveryRate: number;
  avgDaysToDeliver: number;
  deliveryCurve: { date: string; delivered: number }[];
  operationBreakdown: { operation: string; count: number }[];
  perCustomer: CustomerRollup[];
  recentScans: RecentScan[];
  pieces: PieceRow[];
}

interface CompanyOption {
  id: string;
  name: string;
  pieceCount: number;
}

const FUNNEL_ORDER = [
  "ORIGIN_ACCEPTANCE",
  "ORIGIN_PROCESSED",
  "IN_TRANSIT",
  "DESTINATION_PROCESSED",
  "DESTINATION_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const FUNNEL_LABELS: Record<string, string> = {
  ORIGIN_ACCEPTANCE: "Picked up at C&D",
  ORIGIN_PROCESSED: "Sorted at origin",
  IN_TRANSIT: "Moving between facilities",
  DESTINATION_PROCESSED: "At destination sort",
  DESTINATION_DELIVERY: "At delivery unit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export default function MailTrackingPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [openPieceId, setOpenPieceId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mailers")
      .then((r) => r.json())
      .then((d) => setCompanies(d.mailers ?? []))
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = companyId
      ? `/api/mail-tracking/overview?companyId=${companyId}`
      : "/api/mail-tracking/overview";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96 text-stone">
        Loading mail tracking…
      </div>
    );
  }

  const sc = data.statusCounts ?? {};
  const delivered = (sc.DELIVERED ?? 0) + (sc.DELIVERED_INFERRED ?? 0);
  const accepted =
    (sc.ACCEPTED ?? 0) +
    (sc.IN_TRANSIT ?? 0) +
    (sc.OUT_FOR_DELIVERY ?? 0);
  const pending = sc.PENDING ?? 0;
  const undeliv = sc.UNDELIVERABLE ?? 0;
  const hasAnyScans = (data.scanCount ?? 0) > 0;
  const hasDeliveries = delivered > 0;

  const selectedCompany = companies.find((c) => c.id === companyId);
  const scopeLabel = companyId
    ? selectedCompany?.name ?? "Customer"
    : `All customers (${data.perCustomer?.length ?? 0})`;

  // Build funnel data in proper order, only including non-zero stages
  const funnelData = FUNNEL_ORDER.map((op) => {
    const found = data.operationBreakdown.find((b) => b.operation === op);
    return {
      operation: op,
      label: FUNNEL_LABELS[op],
      count: found?.count ?? 0,
    };
  }).filter((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone">
              Mail Tracking · {scopeLabel}
            </div>
            <h1 className="text-2xl font-display font-medium text-ink">
              {hasAnyScans
                ? `${data.scanCount.toLocaleString()} scans on ${(accepted + delivered).toLocaleString()} pieces`
                : "No scans received yet"}
            </h1>
            <p className="text-sm text-stone mt-1">
              USPS IV-MTR · live barcode tracking · {data.pieceCount.toLocaleString()} pieces in scope
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {companies.length > 0 && (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="h-9 rounded border border-line bg-white px-3 text-sm"
            >
              <option value="">All customers</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <Badge variant="success">Live via IV-MTR</Badge>
        </div>
      </div>

      {/* KPIs — only the meaningful ones for this dataset */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Active Pieces"
          value={data.pieceCount}
          icon={Mail}
          iconColor="text-blue-600 bg-blue-100"
          helpText={
            data.archivedCount && data.archivedCount > 0
              ? `${data.archivedCount.toLocaleString()} more archived (drops > 30d, past USPS scan window)`
              : "Imported into the portal across all active campaigns"
          }
        />
        <KPICard
          label="Scanned by USPS"
          value={accepted + delivered}
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-100"
          helpText={
            hasAnyScans
              ? `${(((accepted + delivered) / Math.max(1, data.pieceCount)) * 100).toFixed(1)}% of pieces have at least one scan`
              : "No scans received yet"
          }
        />
        <KPICard
          label="Total Scans"
          value={data.scanCount}
          icon={MapPin}
          iconColor="text-violet-600 bg-violet-100"
          helpText="Each USPS facility scan is one event"
        />
        <KPICard
          label="Delivered"
          value={delivered}
          icon={Clock}
          iconColor={delivered > 0 ? "text-emerald-600 bg-emerald-100" : "text-stone bg-paper-soft"}
          helpText={
            hasDeliveries
              ? `${(data.deliveryRate * 100).toFixed(1)}% delivery rate`
              : "No DELIVERED scans yet (mail still in transit)"
          }
        />
      </div>

      {/* Per-customer rollup (only on "All customers" admin view) */}
      {!companyId && data.perCustomer && data.perCustomer.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Customer Rollup</CardTitle>
            <p className="text-xs text-stone">
              Click a row to filter the rest of the page to that customer.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-stone uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="text-right font-medium">Pieces</th>
                    <th className="text-right font-medium">Pieces with scans</th>
                    <th className="text-right font-medium">Delivered</th>
                    <th className="text-right font-medium">Total scans</th>
                    <th className="text-right font-medium">Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perCustomer.map((c) => {
                    const pctScanned =
                      c.pieceCount > 0 ? (c.acceptedCount / c.pieceCount) * 100 : 0;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setCompanyId(c.id)}
                        className="border-b border-line last:border-0 cursor-pointer hover:bg-paper-soft transition-colors"
                      >
                        <td className="py-3 font-medium text-ink">{c.name}</td>
                        <td className="text-right">{c.pieceCount.toLocaleString()}</td>
                        <td className="text-right">
                          {c.acceptedCount.toLocaleString()}{" "}
                          <span className="text-stone text-xs">({pctScanned.toFixed(0)}%)</span>
                        </td>
                        <td className="text-right">{c.deliveredCount.toLocaleString()}</td>
                        <td className="text-right text-stone">{c.scanCount.toLocaleString()}</td>
                        <td className="text-right text-stone text-xs">
                          {c.lastScanAt ? timeAgo(c.lastScanAt) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funnel + recent scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Scan Funnel</CardTitle>
            <p className="text-xs text-stone">
              How many scans hit each USPS pipeline stage. Drop-off = pieces still in earlier stages.
            </p>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D2" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    width={170}
                  />
                  <RTooltip />
                  <Bar dataKey="count" fill="#B85C3D" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-stone text-sm">
                No scans yet — funnel populates as USPS reports activity.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <p className="text-xs text-stone">Latest USPS scans coming in</p>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentScans.length === 0 ? (
              <div className="text-center py-12 text-stone text-sm px-4">
                No scans received yet.
              </div>
            ) : (
              <div className="divide-y divide-line max-h-[400px] overflow-y-auto">
                {data.recentScans.slice(0, 50).map((s) => (
                  <div key={s.id} className="px-4 py-2.5 text-xs hover:bg-paper-soft">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink truncate">
                        {s.companyName ?? "—"}
                      </span>
                      <span className="text-stone text-[10px] shrink-0">
                        {timeAgo(s.scanDatetime)}
                      </span>
                    </div>
                    <div className="text-stone mt-0.5 truncate">
                      {FUNNEL_LABELS[s.operation] ?? s.operation}
                      {s.facilityCity &&
                        ` · ${s.facilityCity}${s.facilityState ? `, ${s.facilityState}` : ""}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent piece-level activity (last 50 pieces with scans) */}
      {data.pieces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Scanned Pieces</CardTitle>
            <p className="text-xs text-stone">
              Click a row for the full scan timeline of that piece.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-stone uppercase tracking-wider border-b border-line">
                  <tr>
                    {!companyId && <th className="py-2 font-medium">Customer</th>}
                    <th className="py-2 font-medium">Recipient</th>
                    <th className="font-medium">Destination</th>
                    <th className="font-medium">Status</th>
                    <th className="font-medium">First scan</th>
                    <th className="font-medium">Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pieces.slice(0, 100).map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setOpenPieceId(p.id)}
                      className="border-b border-line last:border-0 cursor-pointer hover:bg-paper-soft"
                    >
                      {!companyId && (
                        <td className="py-2 text-stone">{p.company?.name ?? "—"}</td>
                      )}
                      <td className="py-2">{p.recipientName ?? <span className="text-stone">—</span>}</td>
                      <td className="text-stone">
                        {[p.city, p.state, p.zip5].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td>
                        <Badge
                          variant={
                            p.status === "DELIVERED" || p.status === "DELIVERED_INFERRED"
                              ? "success"
                              : p.status === "UNDELIVERABLE"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="text-stone text-xs">
                        {p.firstScanAt ? new Date(p.firstScanAt).toLocaleString() : "—"}
                      </td>
                      <td className="text-stone text-xs">
                        {p.deliveredAt ? new Date(p.deliveredAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {undeliv > 0 && (
        <Card className="border-rose-200 bg-rose-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="text-sm">
              <strong className="text-rose-900">{undeliv.toLocaleString()} undeliverable</strong>{" "}
              <span className="text-rose-700">
                — UAA scans (bad address, vacant, refused). Worth cleansing the list.
              </span>
            </div>
            <a
              href={`/api/mail-pieces/undeliverable${companyId ? `?companyId=${companyId}` : ""}`}
              download
              className="text-sm font-medium text-rose-700 hover:text-rose-900 bg-white border border-rose-200 rounded px-3 py-1.5"
            >
              Download CSV
            </a>
          </CardContent>
        </Card>
      )}

      <PieceDetailModal
        pieceId={openPieceId}
        onClose={() => setOpenPieceId(null)}
      />
    </div>
  );
}
