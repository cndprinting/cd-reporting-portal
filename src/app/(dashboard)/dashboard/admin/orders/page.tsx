"use client";

/**
 * Admin Orders page — list all orders + create new.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  FileCheck,
  CreditCard,
  Send,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  orderCode: string;
  description: string | null;
  quantity: number;
  dropDate: string | null;
  totalPrice: number | null;
  status: string;
  company: { id: string; name: string };
  campaign: { id: string; name: string; campaignCode: string };
  proof: { pdfUrl: string; uploadedAt: string } | null;
  approval: { approvedAt: string; approvedByName: string } | null;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  campaignCode: string;
  companyId: string;
}

const STATUS_LABEL: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  DRAFT: { label: "Draft", icon: Clock, color: "bg-slate-100 text-slate-700" },
  IN_PREP: { label: "In Prep", icon: Package, color: "bg-amber-100 text-amber-700" },
  PROOF_READY: { label: "Proof Ready", icon: FileCheck, color: "bg-sky-100 text-sky-700" },
  APPROVED: { label: "Approved + Paid", icon: CreditCard, color: "bg-violet-100 text-violet-700" },
  SCHEDULED: { label: "Scheduled", icon: Send, color: "bg-indigo-100 text-indigo-700" },
  DROPPED: { label: "Dropped", icon: Truck, color: "bg-blue-100 text-blue-700" },
  DELIVERING: { label: "Delivering", icon: Truck, color: "bg-blue-100 text-blue-700" },
  COMPLETE: { label: "Complete", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "bg-rose-100 text-rose-700" },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    companyId: "",
    campaignId: "",
    description: "",
    quantity: 1000,
    dropDate: "",
    mailClass: "First-Class",
    mailShape: "postcard",
    pricePerPiece: 0.85,
    setupFee: 0,
  });
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetch("/api/orders").then((r) => r.json()).then((d) => setOrders(d.orders ?? []));
    fetch("/api/companies").then((r) => r.json()).then((d) => setCompanies(d.companies ?? []));
    fetch("/api/campaigns").then((r) => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : d.campaigns ?? [];
      setCampaigns(arr);
    });
  };

  useEffect(() => { load(); }, []);

  const filteredCampaigns = campaigns.filter((c) => c.companyId === form.companyId);
  const totalPrice = (form.quantity * form.pricePerPiece) + form.setupFee;

  const createOrder = async () => {
    if (!form.companyId || !form.campaignId || !form.quantity) return;
    setCreating(true);
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, totalPrice }),
      });
      setShowCreate(false);
      setForm({ ...form, description: "", quantity: 1000 });
      load();
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500">Manage customer mailings from quote to delivery</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" />
          New Order
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Create Order</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Customer</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value, campaignId: "" })}
                >
                  <option value="">Select customer…</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Campaign</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                  value={form.campaignId}
                  onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
                  disabled={!form.companyId}
                >
                  <option value="">Select campaign…</option>
                  {filteredCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.campaignCode} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 mb-1 block">Description</label>
                <Input
                  placeholder="Spring homeowner mailer, 6x9 postcard"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Quantity</label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Drop Date</label>
                <Input
                  type="date"
                  value={form.dropDate}
                  onChange={(e) => setForm({ ...form, dropDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Mail Class</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                  value={form.mailClass}
                  onChange={(e) => setForm({ ...form, mailClass: e.target.value })}
                >
                  <option>First-Class</option>
                  <option>Marketing Mail</option>
                  <option>Nonprofit</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Mail Shape</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                  value={form.mailShape}
                  onChange={(e) => setForm({ ...form, mailShape: e.target.value })}
                >
                  <option>postcard</option>
                  <option>letter</option>
                  <option>flat</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Price per Piece ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.pricePerPiece}
                  onChange={(e) => setForm({ ...form, pricePerPiece: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Setup Fee ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.setupFee}
                  onChange={(e) => setForm({ ...form, setupFee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="md:col-span-2 bg-gray-50 rounded-lg p-3 text-sm">
                <span className="text-gray-600">Total: </span>
                <span className="font-bold text-gray-900 text-lg">${totalPrice.toFixed(2)}</span>
                <span className="text-gray-400 text-xs ml-2">
                  ({form.quantity.toLocaleString()} × ${form.pricePerPiece.toFixed(2)}
                  {form.setupFee > 0 ? ` + $${form.setupFee} setup` : ""})
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createOrder} disabled={creating || !form.companyId || !form.campaignId}>
                {creating ? "Creating…" : "Create Order"}
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
                <th className="px-4 py-3">Order</th>
                <th>Customer</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price</th>
                <th>Drop Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No orders yet. Click &ldquo;New Order&rdquo; above to create one.
                  </td>
                </tr>
              )}
              {orders.map((o) => {
                const s = STATUS_LABEL[o.status] ?? STATUS_LABEL.DRAFT;
                const Icon = s.icon;
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold">{o.orderCode}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{o.description ?? "—"}</div>
                    </td>
                    <td>{o.company.name}</td>
                    <td className="text-right">{o.quantity.toLocaleString()}</td>
                    <td className="text-right">{o.totalPrice ? `$${o.totalPrice.toFixed(2)}` : "—"}</td>
                    <td className="text-xs">
                      {o.dropDate ? new Date(o.dropDate).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <Badge className={`${s.color} gap-1`}>
                        <Icon className="h-3 w-3" />
                        {s.label}
                      </Badge>
                    </td>
                    <td className="text-right pr-4">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="text-brand-600 hover:underline text-xs font-medium"
                      >
                        Manage →
                      </Link>
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
