"use client";

/**
 * Admin customer detail drill-down.
 *
 * Shows everything about one customer in one place: contact info, KPI strip
 * (orders / IMbs / scans / delivered), recent orders table, campaigns,
 * users. Clickable through to individual orders + campaigns.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  Globe,
  Phone,
  MapPin,
  Mail as MailIcon,
  Package,
  Send,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  externalCustomerId: string | null;
  brandPrimary: string | null;
  brandTagline: string | null;
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  campaigns: {
    id: string;
    name: string;
    campaignCode: string;
    createdAt: string;
    _count: { mailPieces: number };
  }[];
  orders: {
    id: string;
    orderCode: string;
    description: string | null;
    quantity: number;
    status: string;
    totalPrice: number | null;
    dropDate: string | null;
    createdAt: string;
    isCustomQuote: boolean;
  }[];
  stats: {
    pieceCount: number;
    scanCount: number;
    deliveredCount: number;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  QUOTE_REQUESTED: "bg-violet-100 text-violet-700",
  QUOTE_PROVIDED: "bg-emerald-100 text-emerald-700",
  QUOTE_REJECTED: "bg-rose-100 text-rose-700",
  IN_PREP: "bg-sky-100 text-sky-700",
  PROOF_READY: "bg-amber-100 text-amber-700",
  APPROVED: "bg-violet-100 text-violet-700",
  DROPPED: "bg-blue-100 text-blue-700",
  DELIVERING: "bg-indigo-100 text-indigo-700",
  COMPLETE: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/companies/${id}`)
      .then((r) => r.json())
      .then((d) => setCompany(d))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !company) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Loading customer…
      </div>
    );
  }

  const deliveryRate =
    company.stats.pieceCount > 0
      ? (company.stats.deliveredCount / company.stats.pieceCount) * 100
      : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/admin/companies"
        className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> Back to customers
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center h-12 w-12 rounded-lg text-white font-bold text-lg"
            style={{ backgroundColor: company.brandPrimary ?? "#0ea5e9" }}
          >
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {!company.isActive && (
                <Badge className="bg-gray-100 text-gray-600">Archived</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
              {company.industry && <span>{company.industry}</span>}
              {company.externalCustomerId && (
                <span className="font-mono">
                  Godzilla #{company.externalCustomerId}
                </span>
              )}
              {company.brandTagline && <span>· {company.brandTagline}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {company.website && (
              <div className="flex items-center gap-2 text-gray-700">
                <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline truncate"
                >
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>{company.phone}</span>
              </div>
            )}
            {company.address && (
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{company.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Orders
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">
              {company.orders.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Mail Pieces
            </div>
            <div className="text-2xl font-bold text-sky-700 mt-0.5">
              {company.stats.pieceCount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              USPS Scans
            </div>
            <div className="text-2xl font-bold text-violet-700 mt-0.5">
              {company.stats.scanCount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Delivered
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">
              {company.stats.deliveredCount.toLocaleString()}
            </div>
            {company.stats.pieceCount > 0 && (
              <div className="text-[10px] text-emerald-600 mt-0.5">
                {deliveryRate.toFixed(1)}% rate
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            Recent Orders ({company.orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {company.orders.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-12">
              No orders yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b bg-gray-50">
                <tr>
                  <th className="py-2 px-3">Order</th>
                  <th>Description</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th>Drop</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {company.orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-2 px-3">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                      >
                        {o.orderCode}
                      </Link>
                      {o.isCustomQuote && (
                        <Badge className="ml-2 bg-violet-100 text-violet-700 text-[9px]">
                          Custom
                        </Badge>
                      )}
                    </td>
                    <td className="text-xs text-gray-700 max-w-xs truncate">
                      {o.description ?? "—"}
                    </td>
                    <td className="text-right text-xs tabular-nums">
                      {o.quantity.toLocaleString()}
                    </td>
                    <td className="text-right text-xs tabular-nums">
                      {o.totalPrice ? `$${o.totalPrice.toFixed(2)}` : "—"}
                    </td>
                    <td className="text-xs text-gray-600">
                      {o.dropDate
                        ? new Date(o.dropDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <Badge
                        className={
                          statusColors[o.status] ?? "bg-gray-100 text-gray-600"
                        }
                      >
                        {o.status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4 text-gray-400" />
            Campaigns ({company.campaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {company.campaigns.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8">
              No campaigns.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b bg-gray-50">
                <tr>
                  <th className="py-2 px-3">Code</th>
                  <th>Name</th>
                  <th className="text-right">Pieces</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {company.campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-2 px-3 font-mono text-xs">
                      {c.campaignCode}
                    </td>
                    <td className="text-sm">{c.name}</td>
                    <td className="text-right text-xs tabular-nums">
                      {c._count.mailPieces.toLocaleString()}
                    </td>
                    <td className="text-xs text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MailIcon className="h-4 w-4 text-gray-400" />
            Users ({company.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {company.users.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8">
              No users yet — invite one from the Users page.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b bg-gray-50">
                <tr>
                  <th className="py-2 px-3">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {company.users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 px-3 text-sm font-medium">{u.name}</td>
                    <td className="text-xs text-gray-700">{u.email}</td>
                    <td>
                      <Badge className="bg-gray-100 text-gray-700">
                        {u.role.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
