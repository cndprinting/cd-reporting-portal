"use client";

import Link from "next/link";
import {
  Shield,
  Building2,
  Users,
  Megaphone,
  Upload,
  Activity,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Total Companies", value: 3, icon: Building2, color: "text-brand-600 bg-brand-100" },
  { label: "Total Campaigns", value: 5, icon: Megaphone, color: "text-teal-600 bg-teal-100" },
  { label: "Total Users", value: 8, icon: Users, color: "text-amber-600 bg-amber-100" },
  { label: "Active Campaigns", value: 3, icon: Activity, color: "text-emerald-600 bg-emerald-100" },
];

const quickActions = [
  { label: "Manage Companies", href: "/dashboard/admin/companies", icon: Building2 },
  { label: "Manage Users", href: "/dashboard/admin/users", icon: Users },
  { label: "Manage Campaigns", href: "/dashboard/admin/campaigns", icon: Megaphone },
  { label: "Upload Data", href: "#", icon: Upload },
];

const recentActivity = [
  { text: "Sarah Johnson created campaign 'Luxury Home Seller Campaign'", time: "2 hours ago" },
  { text: "New user Mike Chen added to Sunshine Realty Group", time: "5 hours ago" },
  { text: "Campaign 'Geo-Targeted Retargeting Push' status changed to Completed", time: "1 day ago" },
  { text: "Palm Coast Insurance account activated", time: "2 days ago" },
  { text: "Data upload completed for Spring Homeowner Mailer", time: "3 days ago" },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Manage companies, users, and campaigns</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const StatIcon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${stat.color} mb-3`}>
                <StatIcon className="h-5 w-5" />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:border-brand-300 hover:bg-brand-50"
                  >
                    <ActionIcon className="h-5 w-5 text-brand-600" />
                    <span className="text-xs font-medium">{action.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1.5">
                  <div className="h-2 w-2 rounded-full bg-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{item.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
