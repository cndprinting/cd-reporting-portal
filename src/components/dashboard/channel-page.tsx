"use client";

import React, { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, MousePointerClick, Users, DollarSign } from "lucide-react";
import { getDemoMetrics, getChannelKPIs, getTimeSeriesData } from "@/lib/demo-data";
import { KPICard } from "@/components/dashboard/kpi-card";
import { TimeSeriesChart } from "@/components/dashboard/channel-chart";
import { MetricsTable } from "@/components/dashboard/metrics-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ChannelPageProps {
  channelType: string;
  title: string;
  icon: LucideIcon;
}

export function ChannelPage({ channelType, title, icon: Icon }: ChannelPageProps) {
  const channelKPIs = useMemo(() => {
    const all = getChannelKPIs();
    return all[channelType] || {
      impressions: 0,
      clicks: 0,
      leads: 0,
      calls: 0,
      qualifiedCalls: 0,
      piecesDelivered: 0,
      qrScans: 0,
      spend: 0,
    };
  }, [channelType]);

  const timeSeriesData = useMemo(() => {
    const metrics = getDemoMetrics().filter((m) => m.channel === channelType);
    const byDate: Record<string, { date: string; impressions: number; clicks: number; leads: number; calls: number; spend: number }> = {};

    for (const m of metrics) {
      if (!byDate[m.date]) {
        byDate[m.date] = { date: m.date, impressions: 0, clicks: 0, leads: 0, calls: 0, spend: 0 };
      }
      byDate[m.date].impressions += m.impressions;
      byDate[m.date].clicks += m.clicks;
      byDate[m.date].leads += m.leads;
      byDate[m.date].calls += m.calls;
      byDate[m.date].spend += m.spend;
    }

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [channelType]);

  const tableData = useMemo(() => {
    const metrics = getDemoMetrics().filter((m) => m.channel === channelType);
    const byDate: Record<string, { date: string; impressions: number; clicks: number; leads: number; calls: number; qrScans: number; piecesDelivered: number; spend: number }> = {};

    for (const m of metrics) {
      if (!byDate[m.date]) {
        byDate[m.date] = { date: m.date, impressions: 0, clicks: 0, leads: 0, calls: 0, qrScans: 0, piecesDelivered: 0, spend: 0 };
      }
      byDate[m.date].impressions += m.impressions;
      byDate[m.date].clicks += m.clicks;
      byDate[m.date].leads += m.leads;
      byDate[m.date].calls += m.calls;
      byDate[m.date].qrScans += m.qrScans;
      byDate[m.date].piecesDelivered += m.piecesDelivered;
      byDate[m.date].spend += m.spend;
    }

    return Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
  }, [channelType]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">Performance metrics and analytics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Impressions"
          value={channelKPIs.impressions}
          icon={Eye}
          iconColor="text-blue-600 bg-blue-100"
          delta={8.3}
          helpText="Total number of ad displays across all campaigns"
        />
        <KPICard
          label="Clicks"
          value={channelKPIs.clicks}
          icon={MousePointerClick}
          iconColor="text-teal-600 bg-teal-100"
          delta={12.1}
          helpText="Total clicks on ads or links"
        />
        <KPICard
          label="Leads"
          value={channelKPIs.leads}
          icon={Users}
          iconColor="text-amber-600 bg-amber-100"
          delta={5.7}
          helpText="Total leads generated from this channel"
        />
        <KPICard
          label="Spend"
          value={channelKPIs.spend}
          icon={DollarSign}
          iconColor="text-emerald-600 bg-emerald-100"
          delta={-2.4}
          format="currency"
          helpText="Total ad spend for this channel"
        />
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{title} Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart data={timeSeriesData} height={350} />
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <MetricsTable data={tableData} title={`${title} Daily Metrics`} />
    </div>
  );
}
