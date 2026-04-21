"use client";

/**
 * Admin: Campaigns — list real campaigns + create new.
 */

import { useEffect, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Campaign {
  id: string;
  name: string;
  campaignCode: string;
  description: string | null;
  status: string;
  createdAt: string;
  company: { id: string; name: string };
  _count?: { orders: number; mailPieces: number };
}

interface Company {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  LIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-gray-100 text-gray-600",
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    companyId: "",
    description: "",
    campaignCode: "",
    status: "DRAFT",
  });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? []));
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name || !form.companyId) {
      setErr("Name and customer required");
      return;
    }
    setErr(null);
    setCreating(true);
    try {
      const r = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data.error ?? "Create failed");
      } else {
        setShowForm(false);
        setForm({
          name: "",
          companyId: "",
          description: "",
          campaignCode: "",
          status: "DRAFT",
        });
        load();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-sm text-gray-500">Manage campaigns across all customers</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Campaign
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Customer *</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                >
                  <option value="">Select customer…</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Campaign Name *</label>
                <Input
                  placeholder="Spring Homeowner Mailer"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Campaign Code (auto-generated if blank)
                </label>
                <Input
                  placeholder="CD-2026-006"
                  value={form.campaignCode}
                  onChange={(e) => setForm({ ...form, campaignCode: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Initial Status</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option>DRAFT</option>
                  <option>LIVE</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 mb-1 block">Description</label>
                <Input
                  placeholder="Q2 real estate prospecting to owner-occupants in Volusia County"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            {err && (
              <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
                {err}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={creating}>
                {creating ? "Creating…" : "Create Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th>Customer</th>
                <th>Status</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Pieces</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No campaigns yet. Click &ldquo;Create Campaign&rdquo; above to add the first one.
                  </td>
                </tr>
              )}
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                      {c.campaignCode}
                    </div>
                  </td>
                  <td>{c.company?.name ?? "—"}</td>
                  <td>
                    <Badge className={statusColors[c.status] ?? "bg-gray-100 text-gray-600"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="text-right">{c._count?.orders ?? 0}</td>
                  <td className="text-right">
                    {(c._count?.mailPieces ?? 0).toLocaleString()}
                  </td>
                  <td className="text-xs text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
