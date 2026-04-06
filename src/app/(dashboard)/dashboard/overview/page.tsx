"use client";

import React from "react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { TimeSeriesChart, ChannelBarChart, ChannelPieChart } from "@/components/dashboard/channel-chart";
import { getChannelKPIs, getTimeSeriesData, getAggregatedKPIs } from "@/lib/demo-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Mail, Phone, Globe, Share2, Target,
  Inbox, Video, QrCode, Clock, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OverviewPage() {
  const channelKpis = getChannelKPIs();
  const totals = getAggregatedKPIs();
  const timeSeries = getTimeSeriesData();

  const lastUpdated = new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  const randomDelta = () => Math.round((Math.random() * 40 - 15) * 10) / 10;

  const mailKpi = channelKpis["MAIL_TRACKING"] || { piecesDelivered: 0 };
  const callKpi = channelKpis["CALL_TRACKING"] || { calls: 0, qualifiedCalls: 0 };
  const googleKpi = channelKpis["GOOGLE_ADS"] || { impressions: 0, clicks: 0 };
  const fbKpi = channelKpis["FACEBOOK_ADS"] || { impressions: 0, clicks: 0 };
  const behavKpi = channelKpis["BEHAVIORAL_ADS"] || { impressions: 0 };
  const gmailKpi = channelKpis["GMAIL_ADS"] || { impressions: 0, clicks: 0 };
  const ytKpi = channelKpis["YOUTUBE_ADS"] || { impressions: 0 };
  const qrKpi = channelKpis["QR_CODES"] || { qrScans: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Campaign performance across all channels</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            Last updated: {lastUpdated}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Pieces Delivered"
          value={mailKpi.piecesDelivered}
          icon={Mail}
          iconColor="text-blue-600 bg-blue-100"
          delta={randomDelta()}
          helpText="Total mail pieces delivered across all campaigns"
        />
        <KPICard
          label="Calls / Qualified"
          value={callKpi.calls}
          icon={Phone}
          iconColor="text-emerald-600 bg-emerald-100"
          delta={randomDelta()}
          helpText={`${callKpi.qualifiedCalls} qualified calls out of ${callKpi.calls} total`}
        />
        <KPICard
          label="Google Ad Displays"
          value={googleKpi.impressions}
          icon={Globe}
          iconColor="text-red-600 bg-red-100"
          delta={randomDelta()}
          helpText={`${googleKpi.clicks.toLocaleString()} clicks`}
        />
        <KPICard
          label="Facebook Ad Displays"
          value={fbKpi.impressions}
          icon={Share2}
          iconColor="text-indigo-600 bg-indigo-100"
          delta={randomDelta()}
          helpText={`${fbKpi.clicks.toLocaleString()} clicks`}
        />
        <KPICard
          label="Behavioral Ad Displays"
          value={behavKpi.impressions}
          icon={Target}
          iconColor="text-amber-600 bg-amber-100"
          delta={randomDelta()}
          helpText="Retargeting ad impressions"
        />
        <KPICard
          label="Gmail Ad Displays"
          value={gmailKpi.impressions}
          icon={Inbox}
          iconColor="text-pink-600 bg-pink-100"
          delta={randomDelta()}
          helpText={`${gmailKpi.clicks.toLocaleString()} clicks`}
        />
        <KPICard
          label="YouTube Ad Displays"
          value={ytKpi.impressions}
          icon={Video}
          iconColor="text-red-600 bg-red-100"
          delta={randomDelta()}
          helpText="YouTube video ad views"
        />
        <KPICard
          label="QR Code Scans"
          value={qrKpi.qrScans}
          icon={QrCode}
          iconColor="text-violet-600 bg-violet-100"
          delta={randomDelta()}
          helpText="Total QR code scans across campaigns"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart data={timeSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ChannelPieChart data={channelKpis} />
          </CardContent>
        </Card>
      </div>

      {/* Full Width Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad Displays by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelBarChart data={channelKpis} />
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totals.impressions.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Impressions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totals.clicks.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Clicks</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totals.leads.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Leads</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">${Math.round(totals.spend).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Spend</p>
        </div>
      </div>
    </div>
  );
}
