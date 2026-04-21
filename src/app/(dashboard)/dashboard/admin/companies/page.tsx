"use client";

import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Company {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  users?: { email: string; name: string | null }[];
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    address: "",
    phone: "",
  });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name) {
      setErr("Name required");
      return;
    }
    setErr(null);
    setCreating(true);
    try {
      const r = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data.error ?? "Create failed");
      } else {
        setShowForm(false);
        setForm({ name: "", industry: "", website: "", address: "", phone: "" });
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
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500">Manage customer accounts</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Customer
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Company Name *</label>
                <Input
                  placeholder="Aaron Waxman Real Estate"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Industry</label>
                <Input
                  placeholder="Real Estate"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Website</label>
                <Input
                  placeholder="https://aaronwaxman.com"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Phone</label>
                <Input
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 mb-1 block">Address</label>
                <Input
                  placeholder="123 Main St, Daytona Beach, FL 32114"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                {creating ? "Creating…" : "Create Customer"}
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
                <th className="px-4 py-3">Customer</th>
                <th>Industry</th>
                <th className="text-right">Users</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No customers yet. Click “Add Customer” above to create the first one.
                  </td>
                </tr>
              )}
              {companies.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="text-gray-600">{c.industry ?? "—"}</td>
                  <td className="text-right">{c.users?.length ?? 0}</td>
                  <td>
                    <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
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
