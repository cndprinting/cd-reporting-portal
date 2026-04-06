"use client";

import { FileText, BarChart3, Phone, Mail, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reportTypes = [
  {
    title: "Campaign Summary",
    description: "Overview of all campaigns with key performance metrics including impressions, clicks, leads, and ROI.",
    icon: FileText,
    iconColor: "text-brand-600 bg-brand-100",
  },
  {
    title: "Channel Performance",
    description: "Detailed breakdown of performance by marketing channel with comparison analytics.",
    icon: BarChart3,
    iconColor: "text-teal-600 bg-teal-100",
  },
  {
    title: "Call Log Report",
    description: "Complete call tracking log with call duration, disposition, and caller details.",
    icon: Phone,
    iconColor: "text-amber-600 bg-amber-100",
  },
  {
    title: "Mail Delivery Report",
    description: "Direct mail delivery status, delivery rates, and geographic distribution analysis.",
    icon: Mail,
    iconColor: "text-purple-600 bg-purple-100",
  },
  {
    title: "ROI Analysis",
    description: "Return on investment analysis across all channels with cost per lead and cost per acquisition.",
    icon: TrendingUp,
    iconColor: "text-emerald-600 bg-emerald-100",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Generate and download campaign reports</p>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report) => {
          const ReportIcon = report.icon;
          return (
            <Card key={report.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${report.iconColor}`}>
                    <ReportIcon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">{report.description}</p>
                <Button className="w-full bg-brand-600 hover:bg-brand-700 text-white">
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
