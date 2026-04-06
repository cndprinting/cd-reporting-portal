"use client";

import { Megaphone, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChannelLabel } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const campaigns = [
  { id: 1, name: "Spring Homeowner Mailer", code: "CD-2026-001", company: "C&D Printing Demo Account", status: "Live", channels: ["MAIL_TRACKING", "CALL_TRACKING", "GOOGLE_ADS", "FACEBOOK_ADS", "QR_CODES"] },
  { id: 2, name: "South Florida Prospecting", code: "CD-2026-002", company: "C&D Printing Demo Account", status: "Live", channels: ["MAIL_TRACKING", "GOOGLE_ADS", "FACEBOOK_ADS", "BEHAVIORAL_ADS", "GMAIL_ADS"] },
  { id: 3, name: "Investor Lead Gen Q2", code: "CD-2026-003", company: "Sunshine Realty Group", status: "Paused", channels: ["MAIL_TRACKING", "CALL_TRACKING", "GOOGLE_ADS", "YOUTUBE_ADS"] },
  { id: 4, name: "Geo-Targeted Retargeting Push", code: "CD-2026-004", company: "Sunshine Realty Group", status: "Completed", channels: ["BEHAVIORAL_ADS", "FACEBOOK_ADS", "GMAIL_ADS", "YOUTUBE_ADS"] },
  { id: 5, name: "Luxury Home Seller Campaign", code: "CD-2026-005", company: "Palm Coast Insurance", status: "Live", channels: ["MAIL_TRACKING", "CALL_TRACKING", "GOOGLE_ADS", "FACEBOOK_ADS", "BEHAVIORAL_ADS", "QR_CODES"] },
];

const statusColors: Record<string, string> = {
  Live: "bg-emerald-100 text-emerald-700",
  Paused: "bg-amber-100 text-amber-700",
  Completed: "bg-gray-100 text-gray-700",
};

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-sm text-gray-500">Manage all campaigns across companies</p>
          </div>
        </div>
        <Button className="bg-brand-600 hover:bg-brand-700 text-white">
          Create Campaign
        </Button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell className="text-gray-500 font-mono text-xs">{campaign.code}</TableCell>
                <TableCell>{campaign.company}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status] || "bg-gray-100 text-gray-700"}`}>
                    {campaign.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {campaign.channels.map((ch) => (
                      <span
                        key={ch}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700"
                      >
                        {getChannelLabel(ch)}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
