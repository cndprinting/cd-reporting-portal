"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { demoCampaigns, demoCompanies, getDemoMetrics, getChannelKPIs } from "@/lib/demo-data";
import { KPICard } from "@/components/dashboard/kpi-card";
import { TimeSeriesChart } from "@/components/dashboard/channel-chart";
import { MetricsTable } from "@/components/dashboard/metrics-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getStatusColor, getChannelLabel, formatDate } from "@/lib/utils";
import {
  ArrowLeft, ExternalLink, Download, MessageSquare,
  Mail, Phone, Globe, Share2, Target, Inbox, Video, QrCode,
} from "lucide-react";

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  MAIL_TRACKING: Mail,
  CALL_TRACKING: Phone,
  GOOGLE_ADS: Globe,
  FACEBOOK_ADS: Share2,
  BEHAVIORAL_ADS: Target,
  GMAIL_ADS: Inbox,
  YOUTUBE_ADS: Video,
  QR_CODES: QrCode,
};

const channelColors: Record<string, string> = {
  MAIL_TRACKING: "text-blue-600 bg-blue-100",
  CALL_TRACKING: "text-emerald-600 bg-emerald-100",
  GOOGLE_ADS: "text-red-600 bg-red-100",
  FACEBOOK_ADS: "text-indigo-600 bg-indigo-100",
  BEHAVIORAL_ADS: "text-amber-600 bg-amber-100",
  GMAIL_ADS: "text-pink-600 bg-pink-100",
  YOUTUBE_ADS: "text-red-600 bg-red-100",
  QR_CODES: "text-violet-600 bg-violet-100",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const campaign = demoCampaigns.find((c) => c.id === campaignId);

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-gray-400 text-lg">Campaign not found</p>
        <Link href="/dashboard/campaigns" className="text-brand-600 text-sm mt-2 hover:underline">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const company = demoCompanies.find((c) => c.id === campaign.companyId);
  const channelKpis = getChannelKPIs([campaignId]);
  const allMetrics = getDemoMetrics().filter((m) => m.campaignId === campaignId);

  // Aggregate daily metrics across channels
  const byDate: Record<string, { date: string; impressions: number; clicks: number; leads: number; calls: number; qrScans: number; piecesDelivered: number; spend: number }> = {};
  for (const m of allMetrics) {
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
  const tableData = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
  const timeSeriesData = [...tableData].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Campaign Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-gray-600">
              <span><strong>Campaign ID:</strong> {campaign.campaignCode}</span>
              <span><strong>Company:</strong> {company?.name}</span>
              <span><strong>Setup:</strong> {formatDate(campaign.setupDate)}</span>
              {campaign.startDate && <span><strong>Started:</strong> {formatDate(campaign.startDate)}</span>}
            </div>
            {campaign.destinationUrl && (
              <a
                href={campaign.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {campaign.destinationUrl}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Request Changes
            </Button>
            <a href={`/api/export?campaignId=${campaignId}&format=csv`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </a>
          </div>
        </div>

        {/* Creative Preview Placeholder */}
        <div className="mt-4 h-40 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-sm text-gray-400">Mailer Creative Preview</p>
        </div>
      </div>

      {/* Channel KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {campaign.channels.map((ch) => {
          const Icon = channelIcons[ch] || Mail;
          const kpi = channelKpis[ch] || { impressions: 0, clicks: 0, calls: 0, piecesDelivered: 0, qrScans: 0 };
          const color = channelColors[ch] || "text-gray-600 bg-gray-100";

          let value = kpi.impressions;
          let label = `${getChannelLabel(ch)} - Displays`;
          if (ch === "MAIL_TRACKING") { value = kpi.piecesDelivered; label = "Pieces Delivered"; }
          if (ch === "CALL_TRACKING") { value = kpi.calls; label = "Total Calls"; }
          if (ch === "QR_CODES") { value = kpi.qrScans; label = "QR Scans"; }

          return (
            <KPICard
              key={ch}
              label={label}
              value={value}
              icon={Icon}
              iconColor={color}
              delta={Math.round((Math.random() * 40 - 10) * 10) / 10}
            />
          );
        })}
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart data={timeSeriesData} />
        </CardContent>
      </Card>

      {/* Daily Results Table */}
      <MetricsTable data={tableData} title="Daily Campaign Results" />
    </div>
  );
}
