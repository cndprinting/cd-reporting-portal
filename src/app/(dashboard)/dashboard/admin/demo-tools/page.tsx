"use client";

/**
 * Admin Demo Tools — inject mock USPS scan events for any campaign so we can
 * walk customers through the full delivery pipeline live, even before our
 * USPS IV-MTR feed is fully credentialed.
 *
 * Use only for demos. Real data comes from /api/iv-mtr/pull.
 */

import { useEffect, useState } from "react";
import { FlaskConical, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  name: string;
  campaignCode: string;
  companyName?: string;
}

export default function DemoToolsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [pct, setPct] = useState(35);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => {
        const list: Campaign[] = d.campaigns ?? d ?? [];
        setCampaigns(list);
        if (list[0]) setCampaignId(list[0].id);
      });
  }, []);

  const fire = async () => {
    if (!campaignId) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/admin/mock-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, pctDelivered: pct / 100 }),
      });
      const d = await r.json();
      if (!r.ok) setResult(`✗ ${d.error ?? "Failed"}`);
      else
        setResult(
          `✓ ${d.acceptedScansCreated} ACCEPTED + ${d.deliveredScansCreated} DELIVERED scans created. Order status rolled up.`,
        );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-100 text-amber-700">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demo Tools</h1>
          <p className="text-sm text-gray-500">
            Inject fake USPS scan events to show the tracking pipeline without
            waiting for real data
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulate USPS Scans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Campaign</label>
            <select
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campaignCode} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              % of pieces marked DELIVERED ({pct}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={pct}
              onChange={(e) => setPct(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Just dropped</span>
              <span>Half delivered</span>
              <span>Nearly complete</span>
            </div>
          </div>

          <Button
            onClick={fire}
            disabled={busy || !campaignId}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Zap className="h-4 w-4 mr-1" />
            {busy ? "Firing scans…" : "Generate Scans"}
          </Button>

          {result && (
            <div
              className={`rounded-lg p-3 text-sm border ${
                result.startsWith("✓")
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              {result}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What this does</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>
            Creates one <code className="bg-gray-100 px-1">ACCEPTED</code> scan
            per MailPiece on the campaign (dated 3 days ago, at a Kearny NDC
            facility), then a <code className="bg-gray-100 px-1">DELIVERED</code>{" "}
            scan for the selected % (dated 1 day ago, at the recipient&apos;s city).
          </p>
          <p>
            After generation, it rolls piece statuses up (
            <code className="bg-gray-100 px-1">PENDING → DELIVERED</code>) and
            advances any DROPPED orders to{" "}
            <code className="bg-gray-100 px-1">DELIVERING</code> or{" "}
            <code className="bg-gray-100 px-1">COMPLETE</code> (at 80%+).
          </p>
          <p className="text-xs text-gray-500 pt-2 border-t">
            Once our IV-MTR credentials are in Vercel, the cron at{" "}
            <code>/api/iv-mtr/pull</code> handles this automatically from real
            USPS scans.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
