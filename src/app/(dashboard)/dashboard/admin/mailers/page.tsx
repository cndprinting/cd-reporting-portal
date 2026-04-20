"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Key, Mail, Plus, Copy, Check, X, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Mailer {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  campaignCount: number;
  pieceCount: number;
  deliveredCount: number;
  deliveryRate: number;
  mailerIds: string[];
}

interface ApiKeyRow {
  id: string;
  companyId: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export default function MailersPage() {
  const [mailers, setMailers] = useState<Mailer[]>([]);
  const [selected, setSelected] = useState<Mailer | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/mailers")
      .then((r) => r.json())
      .then((d) => setMailers(d.mailers ?? []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/api-keys?companyId=${selected.id}`)
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []));
  }, [selected, newKeyRaw]);

  const createKey = async () => {
    if (!selected || !newKeyName.trim()) return;
    const resp = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyId: selected.id, name: newKeyName.trim() }),
    });
    const data = await resp.json();
    if (data.rawKey) setNewKeyRaw(data.rawKey);
    setNewKeyName("");
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Revoke this key? Any integrations using it will break.")) return;
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    setKeys(keys.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mailer Customers</h1>
            <p className="text-sm text-gray-500">
              Per-customer USPS tracking rollups &middot; API keys for customer pull integrations
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-gray-600 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
          <div>
            C&amp;D CRID <span className="font-mono text-gray-900">2504758</span>
          </div>
          <div>
            MID <span className="font-mono text-gray-900">901052658</span>
          </div>
        </div>
      </div>

      {/* Customer rollup table */}
      <Card>
        <CardHeader>
          <CardTitle>All Mailers</CardTitle>
          <p className="text-sm text-gray-500">
            Delivery performance across every campaign by customer
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b">
                <tr>
                  <th className="py-2">Customer</th>
                  <th>Industry</th>
                  <th className="text-right">Campaigns</th>
                  <th className="text-right">Pieces</th>
                  <th className="text-right">Delivered</th>
                  <th className="text-right">Delivery %</th>
                  <th>MIDs Used</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mailers.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 font-medium">{m.name}</td>
                    <td className="text-gray-600">{m.industry ?? "—"}</td>
                    <td className="text-right">{m.campaignCount}</td>
                    <td className="text-right">{m.pieceCount.toLocaleString()}</td>
                    <td className="text-right">{m.deliveredCount.toLocaleString()}</td>
                    <td className="text-right">
                      <Badge
                        className={
                          m.deliveryRate >= 0.9
                            ? "bg-emerald-100 text-emerald-700"
                            : m.deliveryRate >= 0.8
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }
                      >
                        {(m.deliveryRate * 100).toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="font-mono text-xs text-gray-600">
                      {m.mailerIds.length ? m.mailerIds.join(", ") : "—"}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => {
                          setSelected(m);
                          setNewKeyRaw(null);
                        }}
                        className="text-brand-600 hover:underline text-xs font-medium inline-flex items-center gap-1"
                      >
                        <Key className="h-3 w-3" />
                        Manage API Keys
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* API key drawer for selected customer */}
      {selected && (
        <Card className="border-brand-200">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys — {selected.name}
              </CardTitle>
              <p className="text-sm text-gray-500">
                Customer-scoped keys for <code>GET /api/v1/tracking</code>
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Newly-created key banner */}
            {newKeyRaw && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-900 mb-2">
                  ✓ Key created — copy it now, it won&apos;t be shown again
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs bg-white rounded border border-emerald-200 px-3 py-2 overflow-x-auto">
                    {newKeyRaw}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(newKeyRaw);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Create new key */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-600 mb-1 block">New key name</label>
                <Input
                  placeholder="e.g. Production tracking pull"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <Button onClick={createKey} disabled={!newKeyName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Create Key
              </Button>
            </div>

            {/* Existing keys table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 border-b">
                  <tr>
                    <th className="py-2">Name</th>
                    <th>Prefix</th>
                    <th>Scopes</th>
                    <th>Last Used</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400 text-sm">
                        No API keys yet. Create one above.
                      </td>
                    </tr>
                  )}
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{k.name}</td>
                      <td className="font-mono text-xs text-gray-600">{k.keyPrefix}…</td>
                      <td className="text-xs text-gray-600">{k.scopes}</td>
                      <td className="text-xs text-gray-600">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                      </td>
                      <td>
                        {k.revokedAt ? (
                          <Badge className="bg-rose-100 text-rose-700">Revoked</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        {!k.revokedAt && (
                          <button
                            onClick={() => revokeKey(k.id)}
                            className="text-rose-600 hover:underline text-xs font-medium"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Integration hint */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs text-gray-700 space-y-1 font-mono">
              <div className="font-sans font-semibold text-gray-900 mb-1 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Customer usage
              </div>
              <div>curl https://cd-reporting-portal.vercel.app/api/v1/tracking \</div>
              <div>&nbsp;&nbsp;-H &quot;Authorization: Bearer cdk_live_...&quot;</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Links out */}
      <div className="flex gap-3">
        <Link
          href="/dashboard/mail-tracking"
          className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline font-medium"
        >
          <Mail className="h-4 w-4" /> Back to Mail Tracking
        </Link>
      </div>
    </div>
  );
}
