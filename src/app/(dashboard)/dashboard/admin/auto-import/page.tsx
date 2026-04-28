"use client";

/**
 * SharePoint Auto-Import Queue
 *
 * Shows the audit log of files the SharePoint watcher has processed (or
 * failed to process). Admin can:
 *   - Manually trigger a poll ("Run now" button) without waiting for cron
 *   - See per-file status, customer routing, IMb counts
 *   - Drill into a created Order
 */

import { useEffect, useState } from "react";
import { CloudDownload, Loader2, Play, RotateCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ImportRow {
  id: string;
  fileName: string;
  fileSize: number;
  folderName: string;
  matchedCompanyId: string | null;
  createdOrderId: string | null;
  imbsImported: number;
  imbsSkipped: number;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  matchedCompany?: { name: string } | null;
}

export default function AutoImportPage() {
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<{
    scanned: number;
    processed: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/sharepoint-imports")
      .then((r) => r.json())
      .then((d) => setImports(d.items ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const runNow = async () => {
    setRunning(true);
    setErr(null);
    setLastRun(null);
    try {
      const r = await fetch("/api/cron/sharepoint-poll");
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error ?? "Poll failed");
        return;
      }
      setLastRun({
        scanned: d.scanned ?? 0,
        processed: d.processed ?? 0,
        failed: d.failed ?? 0,
        skipped: d.skipped ?? 0,
      });
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const counts = imports.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      acc.imbsTotal += i.imbsImported;
      return acc;
    },
    { COMPLETED: 0, FAILED: 0, PROCESSING: 0, imbsTotal: 0 } as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-sky-100 text-sky-700">
            <CloudDownload className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SharePoint Auto-Import</h1>
            <p className="text-sm text-gray-500">
              AccuZIP Mail.dat files dropped into the MailerCity SharePoint folder
              auto-import here · runs daily at 7am ET
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runNow}
            disabled={running}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            {running ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            {running ? "Polling…" : "Run Now"}
          </Button>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RotateCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Last-run banner */}
      {lastRun && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-3 text-sm flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              Polled SharePoint — scanned <strong>{lastRun.scanned}</strong> files,
              processed <strong>{lastRun.processed}</strong>, failed{" "}
              <strong>{lastRun.failed}</strong>, skipped{" "}
              <strong>{lastRun.skipped}</strong> non-supported files.
            </div>
          </CardContent>
        </Card>
      )}

      {err && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="py-3 text-sm text-rose-900 flex items-start gap-2">
            <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Poll failed</div>
              <div className="mt-0.5 text-xs">{err}</div>
              {err.includes("Graph not configured") && (
                <div className="mt-2 text-xs text-rose-800">
                  → Add <code>MS_GRAPH_TENANT_ID</code>,{" "}
                  <code>MS_GRAPH_CLIENT_ID</code>, and{" "}
                  <code>MS_GRAPH_CLIENT_SECRET</code> in Vercel env vars, then
                  redeploy.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Completed
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">
              {counts.COMPLETED ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Failed
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-0.5">
              {counts.FAILED ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              In Progress
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-0.5">
              {counts.PROCESSING ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              IMbs Imported
            </div>
            <div className="text-2xl font-bold text-sky-700 mt-0.5">
              {(counts.imbsTotal ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Imports table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent imports ({imports.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-sm text-gray-400 text-center py-12">Loading…</div>
          ) : imports.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-sm font-medium text-gray-600">No imports yet</div>
              <div className="text-xs text-gray-400 mt-1">
                Drop a Presort folder ZIP into the SharePoint{" "}
                <code className="bg-gray-100 px-1 rounded">Marketing Portal Drops</code>{" "}
                library, then click <strong>Run Now</strong>.
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b bg-gray-50">
                <tr>
                  <th className="py-2 px-3">Status</th>
                  <th>File</th>
                  <th>Customer (folder)</th>
                  <th>Routed to</th>
                  <th className="text-right">IMbs</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {imports.map((i) => (
                  <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      {i.status === "COMPLETED" ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3 mr-0.5 inline" />
                          Done
                        </Badge>
                      ) : i.status === "FAILED" ? (
                        <Badge className="bg-rose-100 text-rose-700">
                          <XCircle className="h-3 w-3 mr-0.5 inline" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">
                          <Clock className="h-3 w-3 mr-0.5 inline" />
                          Processing
                        </Badge>
                      )}
                    </td>
                    <td className="font-mono text-xs">
                      {i.fileName}
                      {i.errorMessage && (
                        <div className="text-[10px] text-rose-700 mt-0.5 max-w-md truncate">
                          {i.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="text-xs text-gray-600">{i.folderName}</td>
                    <td className="text-xs text-gray-600">
                      {i.matchedCompany?.name ?? "—"}
                    </td>
                    <td className="text-right text-xs tabular-nums font-medium">
                      {i.imbsImported.toLocaleString()}
                      {i.imbsSkipped > 0 && (
                        <span className="text-gray-400 text-[10px] ml-1">
                          (+{i.imbsSkipped} dup)
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-gray-500">
                      {new Date(i.startedAt).toLocaleString()}
                    </td>
                    <td>
                      {i.createdOrderId && (
                        <Link
                          href={`/dashboard/orders/${i.createdOrderId}`}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          View order →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-gray-50">
        <CardContent className="py-3 text-xs text-gray-700 space-y-2">
          <div className="font-semibold text-gray-800">How it works</div>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>
              Tom (or anyone with edit access) drops a Presort folder ZIP — or
              just the <code>maildat.pbc</code> file — into the customer&rsquo;s
              subfolder under{" "}
              <code className="bg-white px-1 rounded">Marketing Portal Drops</code>{" "}
              in SharePoint.
            </li>
            <li>
              Cron runs daily at 7am ET (or click <strong>Run Now</strong> for
              instant processing).
            </li>
            <li>
              Watcher matches the folder name to a Company, auto-creates one if
              new, parses every IMb, creates a MailBatch + Order in DROPPED
              state, and imports MailPieces.
            </li>
            <li>
              File moves to <code>_processed/</code> on success or{" "}
              <code>_errors/</code> with a sibling{" "}
              <code>.error.txt</code> on failure.
            </li>
            <li>
              From here on, every USPS scan for those IMbs lands on the
              customer&rsquo;s Mail Tracking dashboard.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
