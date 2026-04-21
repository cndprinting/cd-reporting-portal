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
  Zap,
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
  const overallRate = totalPieces ? totalDelivered / totalPieces : 0;
  const inTransit = totalPieces - totalDelivered;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Portfolio-wide direct mail performance across all customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
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

      {/* Real KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Pieces Tracked"
          value={totalPieces}
          icon={Mail}
          iconColor="text-blue-600 bg-blue-100"
          helpText="Mailpieces imported into the portal across all customers"
        />
        <KPICard
          label="Delivered"
          value={totalDelivered}
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-100"
          helpText="USPS has scanned as delivered or inferred delivered"
        />
        <KPICard
          label="In Transit"
          value={inTransit}
          icon={Truck}
          iconColor="text-amber-600 bg-amber-100"
          helpText="Accepted by USPS, not yet delivered"
        />
        <KPICard
          label="Delivery Rate"
          value={Number((overallRate * 100).toFixed(1))}
          icon={CheckCircle2}
          iconColor="text-violet-600 bg-violet-100"
          format="percent"
          helpText="Delivered / total pieces"
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

      {/* Jump-offs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/attribution">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5 flex items-start gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-violet-100 text-violet-600 shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  Cross-Channel Attribution
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Mail + QR + calls on one timeline per campaign
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

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
