"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Building2, Plus, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Loose-match heuristic: strip non-alphanum, lowercase, check substring both
 * directions. Catches "Aaron Waxman RE" vs "Aaron Waxman Real Estate" and
 * "BH Land" vs "BH Land Group".
 */
function fuzzyMatches(needle: string, hay: string): boolean {
  const n = needle.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const h = hay.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (n.length < 3) return false;
  return h.includes(n) || n.includes(h);
}

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
    if (companies.some((c) => c.name === form.name)) {
      setErr(`"${form.name}" already exists. Pick "— Add a new customer —" above to create a different one.`);
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
                <CompanyNameCombobox
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  companies={companies}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Industry</label>
                <select
                  className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                >
                  <option value="">— Select industry —</option>
                  <option value="Real Estate / Land">Real Estate / Land</option>
                  <option value="Real Estate / Residential">Real Estate / Residential</option>
                  <option value="Real Estate / Commercial">Real Estate / Commercial</option>
                  <option value="Real Estate / Property Management">Real Estate / Property Management</option>
                  <option value="Home Services / HVAC">Home Services / HVAC</option>
                  <option value="Home Services / Plumbing">Home Services / Plumbing</option>
                  <option value="Home Services / Roofing">Home Services / Roofing</option>
                  <option value="Home Services / Landscaping">Home Services / Landscaping</option>
                  <option value="Home Services / Cleaning">Home Services / Cleaning</option>
                  <option value="Home Services / Pest Control">Home Services / Pest Control</option>
                  <option value="Home Services / Other">Home Services / Other</option>
                  <option value="Healthcare / Dental">Healthcare / Dental</option>
                  <option value="Healthcare / Medical Practice">Healthcare / Medical Practice</option>
                  <option value="Healthcare / Chiropractic">Healthcare / Chiropractic</option>
                  <option value="Healthcare / Optometry">Healthcare / Optometry</option>
                  <option value="Healthcare / Veterinary">Healthcare / Veterinary</option>
                  <option value="Legal / Law Firm">Legal / Law Firm</option>
                  <option value="Financial / Insurance">Financial / Insurance</option>
                  <option value="Financial / Accounting">Financial / Accounting</option>
                  <option value="Financial / Mortgage">Financial / Mortgage</option>
                  <option value="Financial / Wealth Management">Financial / Wealth Management</option>
                  <option value="Automotive / Dealer">Automotive / Dealer</option>
                  <option value="Automotive / Repair">Automotive / Repair</option>
                  <option value="Restaurant / Food Service">Restaurant / Food Service</option>
                  <option value="Retail / E-commerce">Retail / E-commerce</option>
                  <option value="Retail / Brick & Mortar">Retail / Brick & Mortar</option>
                  <option value="Fitness / Gym">Fitness / Gym</option>
                  <option value="Fitness / Studio">Fitness / Studio</option>
                  <option value="Beauty / Salon">Beauty / Salon</option>
                  <option value="Beauty / Spa">Beauty / Spa</option>
                  <option value="Education / Tutoring">Education / Tutoring</option>
                  <option value="Education / Private School">Education / Private School</option>
                  <option value="Non-profit">Non-profit</option>
                  <option value="Political / Campaign">Political / Campaign</option>
                  <option value="Religious / House of Worship">Religious / House of Worship</option>
                  <option value="Professional Services">Professional Services</option>
                  <option value="Construction">Construction</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Technology / SaaS">Technology / SaaS</option>
                  <option value="Marketing Agency">Marketing Agency</option>
                  <option value="Print / Mail Industry">Print / Mail Industry</option>
                  <option value="Other">Other</option>
                </select>
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

/**
 * Autocomplete input: you type a name, a panel drops below showing existing
 * customers that match. Click one to fill the input (which then shows a red
 * warning + blocks the Create button upstream). Keep typing past any matches
 * and you're creating a new customer.
 */
function CompanyNameCombobox({
  value,
  onChange,
  companies,
}: {
  value: string;
  onChange: (v: string) => void;
  companies: Company[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const exact = companies.find((c) => c.name.toLowerCase() === value.toLowerCase());
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const sorted = companies.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted.slice(0, 50);
    return sorted.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 50);
  }, [companies, value]);

  return (
    <div className="relative" ref={wrapRef}>
      <Input
        placeholder="Start typing — matches show below"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 border-b bg-gray-50">
            {value.trim()
              ? `${filtered.length} existing customer${filtered.length === 1 ? "" : "s"} match`
              : `${filtered.length} existing customers`}
          </div>
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.name);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center justify-between gap-3 border-b last:border-0"
            >
              <span className="font-medium text-gray-900">{c.name}</span>
              {c.industry && (
                <span className="text-xs text-gray-500 shrink-0">{c.industry}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {exact && (
        <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <span className="font-medium">&ldquo;{value}&rdquo; already exists.</span> Pick
            a different name or cancel and edit the existing record.
          </div>
        </div>
      )}
    </div>
  );
}
