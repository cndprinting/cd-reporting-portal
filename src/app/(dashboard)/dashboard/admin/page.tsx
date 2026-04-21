"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Building2,
  Users,
  Megaphone,
  Activity,
  Palette,
  Mail,
  Key,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Stats {
  companies: number;
  campaigns: number;
  users: number;
  activeCampaigns: number;
}

interface Ingestion {
  id: string;
  source: string;
  recordsReceived: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

const quickActions = [
  { label: "Manage Companies", href: "/dashboard/admin/companies", icon: Building2 },
  { label: "Manage Users", href: "/dashboard/admin/users", icon: Users },
  { label: "Manage Campaigns", href: "/dashboard/admin/campaigns", icon: Megaphone },
  { label: "Customer API Keys", href: "/dashboard/admin/mailers", icon: Key },
  { label: "White-Label Branding", href: "/dashboard/admin/branding", icon: Palette },
  { label: "Scheduled Email Reports", href: "/dashboard/admin/reports", icon: Mail },
  { label: "USPS Feed Monitor", href: "/dashboard/admin/ingestion", icon: Activity },
];

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ingestions, setIngestions] = useState<Ingestion[]>([]);

  useEffect(() => {
    // Pull real counts
    Promise.all([
      fetch("/api/companies").then((r) => r.json()),
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/ingestions").then((r) => r.json()),
    ])
      .then(([companiesResp, campaignsResp, ingestionsResp]) => {
        const companies = companiesResp.companies ?? [];
        const campaigns = campaignsResp.campaigns ?? campaignsResp ?? [];
        setStats({
          companies: companies.length,
          campaigns: Array.isArray(campaigns) ? campaigns.length : 0,
          users: companies.reduce(
            (s: number, c: { users?: unknown[] }) =>
              s + (Array.isArray(c.users) ? c.users.length : 0),
            0,
          ),
          activeCampaigns: Array.isArray(campaigns)
            ? campaigns.filter((c: { status?: string }) => c.status === "LIVE").length
            : 0,
        });
        setIngestions((ingestionsResp.ingestions ?? []).slice(0, 8));
      })
      .catch(() => setStats({ companies: 0, campaigns: 0, users: 0, activeCampaigns: 0 }));
  }, []);

  const statCards = [
    {
      label: "Customers",
      value: stats?.companies ?? "—",
      icon: Building2,
      color: "text-brand-600 bg-brand-100",
    },
    {
      label: "Campaigns",
      value: stats?.campaigns ?? "—",
      icon: Megaphone,
      color: "text-teal-600 bg-teal-100",
    },
    {
      label: "Users",
      value: stats?.users ?? "—",
      icon: Users,
      color: "text-amber-600 bg-amber-100",
    },
    {
      label: "Active Campaigns",
      value: stats?.activeCampaigns ?? "—",
      icon: Activity,
      color: "text-emerald-600 bg-emerald-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">
            Manage customers, users, campaigns, and the USPS data feed
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
            >
              <div
                className={`flex items-center justify-center h-10 w-10 rounded-lg ${stat.color} mb-3`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:border-brand-300 hover:bg-brand-50"
                  >
                    <Icon className="h-5 w-5 text-brand-600" />
                    <span className="text-xs font-medium text-center">
                      {action.label}
                    </span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent USPS Feed Activity (real) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent USPS Feed Activity</CardTitle>
          <Link
            href="/dashboard/admin/ingestion"
            className="text-xs text-brand-600 hover:underline font-medium"
          >
            View feed monitor →
          </Link>
        </CardHeader>
        <CardContent>
          {ingestions.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">
              No USPS scans ingested yet. Activity will appear here once
              subscriptions start receiving scan events.
            </div>
          ) : (
            <div className="space-y-3">
              {ingestions.map((ing) => (
                <div key={ing.id} className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 mt-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        ing.status === "COMPLETED"
                          ? "bg-emerald-500"
                          : ing.status === "FAILED"
                          ? "bg-rose-500"
                          : "bg-amber-500"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">
                      {ing.source === "iv-mtr-push"
                        ? "USPS push"
                        : ing.source === "iv-mtr-pull"
                        ? "USPS pull"
                        : ing.source}{" "}
                      — {ing.recordsReceived.toLocaleString()} records
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(ing.startedAt).toLocaleString()} · {ing.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
