"use client";

/**
 * Dashboard Overview — real numbers only, no fake demo KPIs.
 * Pulls live counts from our APIs; links out to specific channel pages
 * for detailed drill-down.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/kpi-card";

interface Mailer {
  id: string;
  name: string;
  pieceCount: number;
  deliveredCount: number;
  inTransitCount: number;
  pendingCount: number;
  expiredCount: number;
  trackedCount: number;
  deliveryRate: number;
}

export default function OverviewPage() {
  const [mailers, setMailers] = useState<Mailer[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/mailers")
      .then((r) => r.json())
      .then((d) => {
        setMailers(d.mailers ?? []);
        setLastUpdated(
          new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const totalPieces = mailers.reduce((s, m) => s + m.pieceCount, 0);
  const totalDelivered = mailers.reduce((s, m) => s + m.deliveredCount, 0);
  const totalInTransit = mailers.reduce((s, m) => s + (m.inTransitCount ?? 0), 0);
  const totalPending = mailers.reduce((s, m) => s + (m.pendingCount ?? 0), 0);
  const totalExpired = mailers.reduce((s, m) => s + (m.expiredCount ?? 0), 0);
  const totalTracked = mailers.reduce((s, m) => s + (m.trackedCount ?? 0), 0);
  // Active = pieces still capable of producing scan data (not archived/expired)
  const totalActive = totalPieces - totalExpired;
  // Delivery rate is computed against pieces USPS has actually started
  // tracking, not against PENDING pieces (older mail past the scan window).
  const overallRate = totalTracked ? totalDelivered / totalTracked : 0;

  return (
    <div className="space-y-8">
      {/* Editorial hero header */}
      <div className="border-b border-line pb-6">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone">
            Portfolio overview
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone uppercase tracking-wider">
                <Clock className="h-3 w-3" />
                Updated {lastUpdated}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        <h1 className="font-display text-5xl font-medium tracking-tight text-ink leading-tight">
          {totalPieces === 0 ? (
            <>Welcome back.</>
          ) : totalActive === 0 ? (
            <>
              <span className="italic text-brand-600">{totalPieces.toLocaleString()}</span>{" "}
              pieces archived
              <span className="text-stone"> · all past USPS scan window.</span>
            </>
          ) : totalTracked === 0 ? (
            <>
              <span className="italic text-brand-600">{totalActive.toLocaleString()}</span>{" "}
              active pieces awaiting USPS scans
              <span className="text-stone">
                {totalExpired > 0
                  ? ` · ${totalExpired.toLocaleString()} archived.`
                  : "."}
              </span>
            </>
          ) : totalDelivered === 0 ? (
            <>
              <span className="italic text-brand-600">{totalTracked.toLocaleString()}</span>{" "}
              of {totalActive.toLocaleString()} active pieces tracked by USPS
              <span className="text-stone"> · {totalInTransit.toLocaleString()} in transit.</span>
            </>
          ) : (
            <>
              <span className="italic text-brand-600">{totalDelivered.toLocaleString()}</span>{" "}
              of {totalTracked.toLocaleString()} tracked pieces delivered
              <span className="text-stone"> · {((overallRate || 0) * 100).toFixed(0)}% rate.</span>
            </>
          )}
        </h1>
        <p className="text-sm text-stone mt-3 max-w-2xl">
          {mailers.length === 0 ? (
            "No active mail to track yet. When customer orders flow in, they'll show up here automatically."
          ) : (
            <>
              Tracking {mailers.length} customer{mailers.length === 1 ? "" : "s"} across all active campaigns.
              {totalActive > 0 && (
                <>
                  {" "}
                  <strong>{totalActive.toLocaleString()}</strong> active{" "}
                  ({totalTracked.toLocaleString()} with USPS scans, {totalPending.toLocaleString()} awaiting first scan).
                </>
              )}
              {totalExpired > 0 && (
                <>
                  {" "}
                  <span className="text-stone">
                    {totalExpired.toLocaleString()} archived (drops older than 30d, past USPS scan window).
                  </span>
                </>
              )}
            </>
          )}
        </p>
      </div>

      {/* Real KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Pieces Imported"
          value={totalPieces}
          icon={Mail}
          iconColor="text-blue-600 bg-blue-100"
          helpText="Mailpieces in the portal across all customers"
        />
        <KPICard
          label="Tracked by USPS"
          value={totalTracked}
          icon={Truck}
          iconColor={totalTracked > 0 ? "text-amber-600 bg-amber-100" : "text-stone bg-paper-soft"}
          helpText={
            totalPieces > 0
              ? `${((totalTracked / totalPieces) * 100).toFixed(1)}% have at least one USPS scan`
              : "No pieces yet"
          }
        />
        <KPICard
          label="Delivered"
          value={totalDelivered}
          icon={CheckCircle2}
          iconColor={totalDelivered > 0 ? "text-emerald-600 bg-emerald-100" : "text-stone bg-paper-soft"}
          helpText={
            totalDelivered > 0
              ? "Final delivery scan or inferred delivered"
              : totalInTransit > 0
                ? `${totalInTransit.toLocaleString()} still in transit — no deliveries yet`
                : "No deliveries yet"
          }
        />
        <KPICard
          label="Delivery Rate"
          value={Number((overallRate * 100).toFixed(1))}
          icon={CheckCircle2}
          iconColor={totalDelivered > 0 ? "text-violet-600 bg-violet-100" : "text-stone bg-paper-soft"}
          format="percent"
          helpText={
            totalTracked > 0
              ? "Delivered ÷ pieces tracked by USPS"
              : "Awaiting USPS scans"
          }
        />
      </div>

      {/* Per-customer quick view */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Per-Customer Performance</CardTitle>
          <Link
            href="/dashboard/admin/mailers"
            className="text-xs text-brand-600 hover:underline font-medium inline-flex items-center gap-1"
          >
            Manage all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {mailers.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">
              {loading ? "Loading…" : "No customers yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 border-b">
                  <tr>
                    <th className="py-2">Customer</th>
                    <th className="text-right">Pieces</th>
                    <th className="text-right">Delivered</th>
                    <th className="text-right">Delivery %</th>
                  </tr>
                </thead>
                <tbody>
                  {mailers.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{m.name}</td>
                      <td className="text-right">
                        {m.pieceCount.toLocaleString()}
                      </td>
                      <td className="text-right">
                        {m.deliveredCount.toLocaleString()}
                      </td>
                      <td className="text-right font-medium">
                        {(m.deliveryRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jump-offs — Cross-Channel Attribution removed (no QR/call tracking
          live yet, was showing demo data). Will return when channels wire up. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/mail-tracking">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5 flex items-start gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Mail Tracking</div>
                <div className="text-xs text-gray-500 mt-1">
                  Piece-level scan timelines and IMb drilldown
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/ingestion">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5 flex items-start gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-100 text-amber-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  USPS Feed Health
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Monitor incoming scan events from USPS
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
