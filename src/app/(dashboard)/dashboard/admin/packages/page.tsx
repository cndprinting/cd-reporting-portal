"use client";

/**
 * Admin: Mail Packages — create + manage prepaid piece packages per customer.
 */

import { useEffect, useState } from "react";
import { Package, Plus, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface MailPackage {
  id: string;
  name: string;
  totalPieces: number;
  usedPieces: number;
  price: number;
  pricePerPiece: number;
  status: string;
  purchasedAt: string;
  expiresAt: string | null;
  company: { id: string; name: string };
  _count: { drawdowns: number; orders: number };
}

interface Company {
  id: string;
  name: string;
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<MailPackage[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    companyId: "",
    name: "",
    totalPieces: 10000,
    price: 8500,
    expiresAt: "",
  });
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetch("/api/packages").then((r) => r.json()).then((d) => setPackages(d.packages ?? []));
    fetch("/api/companies").then((r) => r.json()).then((d) => setCompanies(d.companies ?? []));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.companyId || !form.totalPieces || !form.price) return;
    setCreating(true);
    try {
      await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ ...form, name: "" });
      load();
    } finally { setCreating(false); }
  };

  const pricePerPiece = form.totalPieces ? form.price / form.totalPieces : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mail Packages</h1>
            <p className="text-sm text-gray-500">Prepaid piece packages for customers</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          New Package
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Package</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Customer</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                >
                  <option value="">Select customer…</option>
                  {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Name (optional)</label>
                <Input
                  placeholder="10k Starter Pack"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Total Pieces</label>
                <Input
                  type="number"
                  value={form.totalPieces}
                  onChange={(e) => setForm({ ...form, totalPieces: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Total Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Expires (optional)</label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm flex items-center">
                <span className="text-gray-600">Price/piece:&nbsp;</span>
                <span className="font-bold text-gray-900">${pricePerPiece.toFixed(3)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={create} disabled={creating || !form.companyId}>
                {creating ? "Creating…" : "Create Package"}
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
                <th className="px-4 py-3">Customer / Package</th>
                <th className="text-right">Pieces</th>
                <th className="text-right">Used</th>
                <th className="text-right">Remaining</th>
                <th>Progress</th>
                <th className="text-right">Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No packages yet.</td></tr>
              )}
              {packages.map((p) => {
                const remaining = p.totalPieces - p.usedPieces;
                const pct = p.totalPieces ? (p.usedPieces / p.totalPieces) * 100 : 0;
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.company.name}</div>
                      <div className="text-xs text-gray-500">{p.name}</div>
                    </td>
                    <td className="text-right font-medium">{p.totalPieces.toLocaleString()}</td>
                    <td className="text-right">{p.usedPieces.toLocaleString()}</td>
                    <td className="text-right font-semibold text-emerald-700">
                      {remaining.toLocaleString()}
                    </td>
                    <td className="w-40">
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-brand-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{pct.toFixed(1)}% used</div>
                    </td>
                    <td className="text-right">${p.price.toLocaleString()}</td>
                    <td>
                      <Badge
                        className={
                          p.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.status === "EXHAUSTED"
                            ? "bg-slate-100 text-slate-700"
                            : p.status === "EXPIRED"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
