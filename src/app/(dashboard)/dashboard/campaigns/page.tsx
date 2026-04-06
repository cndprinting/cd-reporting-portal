"use client";

import React from "react";
import Link from "next/link";
import { demoCampaigns, demoCompanies } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { getStatusColor, getChannelLabel, formatDate } from "@/lib/utils";
import { Search, ExternalLink, Megaphone } from "lucide-react";

export default function CampaignsPage() {
  const [search, setSearch] = React.useState("");

  const filtered = demoCampaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.campaignCode.toLowerCase().includes(search.toLowerCase())
  );

  const getCompanyName = (companyId: string) =>
    demoCompanies.find((c) => c.id === companyId)?.name || "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">{demoCampaigns.length} total campaigns</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((campaign) => (
          <Card key={campaign.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600 shrink-0">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="text-base font-semibold text-gray-900 hover:text-brand-600 transition-colors"
                    >
                      {campaign.name}
                    </Link>
                    <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {campaign.campaignCode} &middot; {getCompanyName(campaign.companyId)}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {campaign.channels.map((ch) => (
                      <span
                        key={ch}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-medium"
                      >
                        {getChannelLabel(ch)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">
                  Setup: {formatDate(campaign.setupDate)}
                </span>
                <Link href={`/dashboard/campaigns/${campaign.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No campaigns found</p>
          </div>
        )}
      </div>
    </div>
  );
}
