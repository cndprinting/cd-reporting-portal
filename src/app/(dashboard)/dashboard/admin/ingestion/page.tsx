"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Ingestion {
  id: string;
  source: string;
  fileName: string | null;
  recordsReceived: number;
  recordsInserted: number;
  recordsSkipped: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export default function IngestionMonitoringPage() {
  const [data, setData] = useState<{ ingestions: Ingestion[]; lastCompletedAt: string | null }>({
    ingestions: [],
    lastCompletedAt: null,
  });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/ingestions")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const lastAgeMs = data.lastCompletedAt
    ? now - new Date(data.lastCompletedAt).getTime()
    : null;
  const stale = lastAgeMs != null && lastAgeMs > 60 * 60 * 1000; // 1 hour

  const totalReceived = data.ingestions.reduce((s, i) => s + i.recordsReceived, 0);
  const totalInserted = data.ingestions.reduce((s, i) => s + i.recordsInserted, 0);
  const failedCount = data.ingestions.filter((i) => i.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IV-MTR Ingestion Monitor</h1>
            <p className="text-sm text-gray-500">
              Live view of USPS scan data pipeline health
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Feed health banner */}
      {stale ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <div className="text-sm">
              <div className="font-semibold text-rose-900">
                No successful ingestion in{" "}
                {lastAgeMs ? Math.round(lastAgeMs / 60_000) : "?"} minutes
              </div>
              <div className="text-rose-700">
                USPS feed may be down, or credentials expired. Check Vercel cron logs and
                IV_MTR_USER_ID/PASSWORD env vars.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        data.lastCompletedAt && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div className="text-sm">
                <div className="font-semibold text-emerald-900">Feed healthy</div>
                <div className="text-emerald-700">
                  Last successful ingestion{" "}
                  {lastAgeMs ? Math.round(lastAgeMs / 60_000) : 0} minutes ago
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Inbox className="h-3 w-3" /> Scans Received (last {data.ingestions.length} runs)
            </div>
            <div className="text-2xl font-semibold">{totalReceived.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <CheckCircle2 className="h-3 w-3" /> Inserted
            </div>
            <div className="text-2xl font-semibold text-emerald-700">
              {totalInserted.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <AlertCircle className="h-3 w-3" /> Failed Runs
            </div>
            <div className={`text-2xl font-semibold ${failedCount > 0 ? "text-rose-700" : "text-gray-900"}`}>
              {failedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Clock className="h-3 w-3" /> Last Ingestion
            </div>
            <div className="text-sm font-semibold">
              {data.lastCompletedAt
                ? new Date(data.lastCompletedAt).toLocaleString()
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Ingestion Runs</CardTitle>
          <p className="text-sm text-gray-500">Auto-refreshes every 60 seconds</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b">
                <tr>
                  <th className="py-2">Started</th>
                  <th>Source</th>
                  <th>File</th>
                  <th className="text-right">Received</th>
                  <th className="text-right">Inserted</th>
                  <th className="text-right">Skipped</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.ingestions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-400 text-sm">
                      No ingestion runs yet. Once USPS approves IV-MTR and the cron fires,
                      runs will appear here.
                    </td>
                  </tr>
                )}
                {data.ingestions.map((i) => {
                  const dur =
                    i.completedAt && i.startedAt
                      ? Math.round(
                          (new Date(i.completedAt).getTime() -
                            new Date(i.startedAt).getTime()) /
                            100,
                        ) / 10
                      : null;
                  return (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="py-2 text-xs text-gray-600">
                        {new Date(i.startedAt).toLocaleString()}
                      </td>
                      <td>
                        <Badge className="bg-gray-100 text-gray-700 text-xs">
                          {i.source}
                        </Badge>
                      </td>
                      <td className="font-mono text-xs text-gray-600">
                        {i.fileName ?? "—"}
                      </td>
                      <td className="text-right">{i.recordsReceived.toLocaleString()}</td>
                      <td className="text-right text-emerald-700">
                        {i.recordsInserted.toLocaleString()}
                      </td>
                      <td className="text-right text-gray-500">
                        {i.recordsSkipped.toLocaleString()}
                      </td>
                      <td>
                        {i.status === "COMPLETED" && (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            Completed
                          </Badge>
                        )}
                        {i.status === "FAILED" && (
                          <Badge className="bg-rose-100 text-rose-700" title={i.errorMessage ?? ""}>
                            Failed
                          </Badge>
                        )}
                        {(i.status === "PENDING" || i.status === "PROCESSING") && (
                          <Badge className="bg-amber-100 text-amber-700">{i.status}</Badge>
                        )}
                      </td>
                      <td className="text-xs text-gray-600">{dur != null ? `${dur}s` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.ingestions.some((i) => i.errorMessage) && (
            <details className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-rose-900">
                Error messages from failed runs
              </summary>
              <div className="mt-2 space-y-1 font-mono text-rose-800">
                {data.ingestions
                  .filter((i) => i.errorMessage)
                  .map((i) => (
                    <div key={i.id}>
                      <span className="text-rose-500">
                        [{new Date(i.startedAt).toLocaleTimeString()}]
                      </span>{" "}
                      {i.errorMessage}
                    </div>
                  ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
