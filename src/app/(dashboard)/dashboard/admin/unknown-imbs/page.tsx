"use client";

/**
 * Unknown IMb Debugger
 *
 * Admin-only. Lists IMbs that USPS has sent scans for, but which don't match
 * any MailPiece in our database. Usually means one of:
 *   - The piece list was never imported (Mail.dat upload missing)
 *   - The piece was imported under a different campaign
 *   - Someone else's MID showed up in our feed (delegation or CRID mix-up)
 *
 * Admin can:
 *   - Mark as resolved (we'll fix it by importing the piece list)
 *   - Dismiss (not ours, remove from list forever)
 */

import { useEffect, useState } from "react";
import { HelpCircle, Trash2, CheckCircle2, RotateCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UnknownImb {
  id: string;
  imb: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrences: number;
  sampleOperation: string | null;
  sampleFacilityCity: string | null;
  sampleFacilityState: string | null;
  sampleFacilityZip: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
}

export default function UnknownImbsPage() {
  const [items, setItems] = useState<UnknownImb[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"unresolved" | "all">("unresolved");
  const [unresolved, setUnresolved] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/unknown-imbs?status=${status}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setUnresolved(d.unresolved ?? 0);
        setResolved(d.resolved ?? 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const act = async (action: "resolve" | "dismiss") => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await fetch("/api/admin/unknown-imbs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: [...selected] }),
      });
      setSelected(new Set());
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-100 text-amber-700">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Unknown IMbs</h1>
            <p className="text-sm text-gray-500">
              Scans USPS sent for IMbs we don&apos;t have in our database — usually a
              missing Mail.dat upload
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RotateCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4">
            <div className="text-xs uppercase tracking-wider text-gray-500">Unresolved</div>
            <div className="text-3xl font-bold text-amber-600 mt-1">{unresolved}</div>
            <div className="text-xs text-gray-500 mt-0.5">Still showing up on pushes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs uppercase tracking-wider text-gray-500">Resolved</div>
            <div className="text-3xl font-bold text-emerald-600 mt-1">{resolved}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Imported since; future scans will match
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs uppercase tracking-wider text-gray-500">Total Scans</div>
            <div className="text-3xl font-bold text-gray-700 mt-1">
              {items.reduce((s, i) => s + i.occurrences, 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Across all unknown IMbs shown
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
              <button
                onClick={() => setStatus("unresolved")}
                className={`px-3 py-1.5 ${
                  status === "unresolved"
                    ? "bg-amber-100 text-amber-900 font-medium"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Unresolved
              </button>
              <button
                onClick={() => setStatus("all")}
                className={`px-3 py-1.5 ${
                  status === "all"
                    ? "bg-amber-100 text-amber-900 font-medium"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                All
              </button>
            </div>
            <CardTitle className="text-sm font-semibold">
              {items.length} row{items.length === 1 ? "" : "s"}
            </CardTitle>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {selected.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={() => act("resolve")}
                disabled={busy}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark resolved
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-rose-700 border-rose-200 hover:bg-rose-50"
                onClick={() => act("dismiss")}
                disabled={busy}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Dismiss
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-sm text-gray-400 text-center py-12">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-sm font-medium text-gray-600">
                No unknown IMbs 🎉
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Every scan USPS sends us matches a piece in our database.
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b bg-gray-50">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.size === items.length && items.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="py-2">IMb</th>
                  <th>Facility</th>
                  <th>Sample Op</th>
                  <th className="text-right">Scans</th>
                  <th>First Seen</th>
                  <th>Last Seen</th>
                  <th className="w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    className={`border-b last:border-0 ${
                      selected.has(it.id) ? "bg-amber-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(it.id)}
                        onChange={() => toggle(it.id)}
                      />
                    </td>
                    <td className="py-2 font-mono text-xs">{it.imb}</td>
                    <td className="text-gray-600 text-xs">
                      {it.sampleFacilityCity && it.sampleFacilityState
                        ? `${it.sampleFacilityCity}, ${it.sampleFacilityState} ${it.sampleFacilityZip ?? ""}`
                        : it.sampleFacilityZip ?? "—"}
                    </td>
                    <td className="text-gray-600 text-xs">{it.sampleOperation ?? "—"}</td>
                    <td className="text-right text-xs tabular-nums font-medium">
                      {it.occurrences.toLocaleString()}
                    </td>
                    <td className="text-xs text-gray-500">
                      {new Date(it.firstSeenAt).toLocaleString()}
                    </td>
                    <td className="text-xs text-gray-500">
                      {new Date(it.lastSeenAt).toLocaleString()}
                    </td>
                    <td>
                      {it.isResolved ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          Resolved
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">Open</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-3 text-xs text-gray-600 bg-gray-50">
          <strong className="text-gray-700">What to do with unknown IMbs:</strong>
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            <li>
              <strong>Mark resolved</strong> — you&rsquo;ve imported the missing piece
              list (via the Mail.dat upload on the order) or you know the IMb is
              ours but was imported under the wrong campaign. Future scans will
              auto-match.
            </li>
            <li>
              <strong>Dismiss</strong> — not our mail at all (e.g. USPS delegated
              a CRID to us that shouldn&rsquo;t have been). Removes it permanently.
            </li>
            <li>
              Auto-resolution happens automatically whenever you import a piece
              list whose IMbs match anything in this table.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
