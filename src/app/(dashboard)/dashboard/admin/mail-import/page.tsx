"use client";

import { useState, useEffect } from "react";
import { Upload, FileText, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ParsedRow {
  imb: string;
  recipientName?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip5?: string;
  zip4?: string;
  expectedInHomeDate?: string;
  isSeed?: boolean;
  _valid: boolean;
  _error?: string;
}

interface Campaign {
  id: string;
  name: string;
  campaignCode: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map((line) => {
    // Naive CSV split — handles quoted fields
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (const c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) {
        cols.push(cur);
        cur = "";
      } else cur += c;
    }
    cols.push(cur);
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = (cols[i] ?? "").trim().replace(/^"|"$/g, "");
    });

    const imb = (rec.imb ?? "").replace(/\D/g, "");
    const valid = [20, 25, 29, 31].includes(imb.length);

    return {
      imb,
      recipientName: rec.recipientname || rec["recipient name"] || "",
      addressLine1: rec.addressline1 || rec.address || "",
      city: rec.city,
      state: rec.state,
      zip5: rec.zip5 || rec.zip,
      zip4: rec.zip4,
      expectedInHomeDate: rec.expectedinhomedate || rec["expected in-home date"] || undefined,
      isSeed: rec.isseed === "true" || rec.isseed === "1",
      _valid: valid,
      _error: valid ? undefined : `IMb must be 20/25/29/31 digits (got ${imb.length})`,
    };
  });
}

export default function MailImportPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [dropDate, setDropDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? d ?? []))
      .catch(() => {});
  }, []);

  const onFile = async (f: File) => {
    setFileName(f.name);
    setResult(null);
    const text = await f.text();
    setRows(parseCSV(text));
  };

  const validRows = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);
  const seedCount = rows.filter((r) => r.isSeed).length;

  const runImport = async () => {
    if (!campaignId || validRows.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      // 1. Create a MailBatch first
      const batchResp = await fetch("/api/mail-batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          batchName: batchName || `Drop ${new Date().toLocaleDateString()}`,
          quantity: validRows.length,
          dropDate,
        }),
      });
      const { id: mailBatchId } = await batchResp.json();

      // 2. Import the rows
      const imp = await fetch("/api/mail-pieces/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          mailBatchId,
          rows: validRows.map(({ _valid: _v, _error: _e, ...r }) => r),
        }),
      });
      const data = await imp.json();
      setResult({ inserted: data.inserted, skipped: data.skipped });
    } catch (e) {
      setResult({ inserted: 0, skipped: validRows.length });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mail File Import</h1>
          <p className="text-sm text-gray-500">
            Upload a CSV of recipients + IMbs to register mailpieces before a drop
          </p>
        </div>
      </div>

      {/* Campaign + batch info */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1 — Campaign &amp; Batch</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Campaign</label>
            <select
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">Select a campaign…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campaignCode} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Batch Name</label>
            <Input
              placeholder="e.g. Drop 1 — Volusia County"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Drop Date</label>
            <Input type="date" value={dropDate} onChange={(e) => setDropDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* File drop */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Step 2 — Upload CSV</CardTitle>
            <p className="text-sm text-gray-500">
              Columns: <code>imb, recipientName, addressLine1, city, state, zip5, zip4, expectedInHomeDate, isSeed</code>
            </p>
          </div>
          <a
            href="/api/mail-pieces/sample-csv?count=100"
            download
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
          >
            <Download className="h-3 w-3" />
            Download sample CSV
          </a>
        </CardHeader>
        <CardContent>
          <label
            className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
          >
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <div className="text-sm font-medium text-gray-900">
              {fileName || "Click to upload or drop a CSV file"}
            </div>
            <div className="text-xs text-gray-500 mt-1">Max ~5000 rows per file</div>
          </label>

          {rows.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-gray-500 text-xs">Total rows</div>
                <div className="text-xl font-semibold">{rows.length.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <div className="text-emerald-600 text-xs">Valid IMbs</div>
                <div className="text-xl font-semibold text-emerald-700">
                  {validRows.length.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg bg-rose-50 p-3">
                <div className="text-rose-600 text-xs">Invalid</div>
                <div className="text-xl font-semibold text-rose-700">
                  {invalidRows.length.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg bg-indigo-50 p-3">
                <div className="text-indigo-600 text-xs">Seed pieces</div>
                <div className="text-xl font-semibold text-indigo-700">{seedCount}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3 — Preview (first 10 rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 border-b">
                  <tr>
                    <th className="py-2">#</th>
                    <th>IMb</th>
                    <th>Recipient</th>
                    <th>Address</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 text-gray-500 text-xs">{i + 1}</td>
                      <td className="font-mono text-xs">{r.imb.slice(0, 20)}…</td>
                      <td>{r.recipientName ?? "—"}</td>
                      <td className="text-gray-600 text-xs">
                        {r.addressLine1}, {r.city}, {r.state} {r.zip5}
                      </td>
                      <td>
                        {r._valid ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            {r.isSeed ? "Valid (SEED)" : "Valid"}
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700">{r._error}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {rows.length > 0 && (
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {validRows.length.toLocaleString()} mailpieces will be imported into the selected
              campaign.
            </div>
            <Button
              onClick={runImport}
              disabled={!campaignId || validRows.length === 0 || importing}
              className="min-w-[160px]"
            >
              {importing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {importing ? "Importing…" : `Import ${validRows.length} pieces`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card
          className={result.inserted > 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}
        >
          <CardContent className="py-4 flex items-center gap-3">
            {result.inserted > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600" />
            )}
            <div className="text-sm">
              <div className="font-semibold">
                Imported {result.inserted.toLocaleString()} pieces
                {result.skipped > 0 && `, skipped ${result.skipped.toLocaleString()}`}
              </div>
              <div className="text-gray-600">
                USPS scans will begin populating once the mail is inducted.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
