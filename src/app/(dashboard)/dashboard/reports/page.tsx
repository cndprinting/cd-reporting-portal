"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Download,
  Mail,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Reports page — every card is wired to a real CSV download or live endpoint.
 * No placeholder buttons.
 */

export default function ReportsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        setCompanyId(d?.user?.companyId ?? null);
        setRole(d?.user?.role ?? null);
      })
      .catch(() => {});
  }, []);

  const scope =
    role === "CUSTOMER" && companyId ? `?companyId=${companyId}` : "";

  const reports = [
    {
      title: "Delivered Mail Report",
      description:
        "CSV of every mailpiece that USPS has scanned as delivered, including IMb, recipient, delivery date, and days to deliver.",
      icon: Mail,
      iconColor: "text-emerald-600 bg-emerald-100",
      href: `/api/mail-pieces/undeliverable${scope}`,
      download: true,
      label: "Download CSV",
      note: "Live data — reflects current scan status",
    },
    {
      title: "Undeliverable Addresses (UAA)",
      description:
        "Pieces USPS flagged as undeliverable (bad address, vacant, refused). Use this for list hygiene.",
      icon: AlertTriangle,
      iconColor: "text-rose-600 bg-rose-100",
      href: `/api/mail-pieces/undeliverable${scope}`,
      download: true,
      label: "Download CSV",
      note: "Refresh before every campaign",
    },
    {
      title: "Weekly Email Reports",
      description:
        role === "ADMIN" || role === "ACCOUNT_MANAGER"
          ? "Branded summary emails automatically go to each customer every Monday at 7am ET. Manage recipients in Admin → Scheduled Reports."
          : "Your weekly campaign summary arrives by email every Monday at 7am ET. No download needed.",
      icon: Clock,
      iconColor: "text-indigo-600 bg-indigo-100",
      href:
        role === "ADMIN" || role === "ACCOUNT_MANAGER"
          ? "/dashboard/admin/reports"
          : null,
      download: false,
      label:
        role === "ADMIN" || role === "ACCOUNT_MANAGER"
          ? "Manage Scheduled Reports"
          : null,
      note: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">
            Download data exports and manage scheduled reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-lg ${r.iconColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{r.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4 min-h-[60px]">
                  {r.description}
                </p>
                {r.href && r.label ? (
                  <a
                    href={r.href}
                    {...(r.download ? { download: true } : {})}
                    className="block"
                  >
                    <Button
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white gap-2"
                      asChild={false}
                    >
                      {r.download ? <Download className="h-4 w-4" /> : null}
                      {r.label}
                    </Button>
                  </a>
                ) : (
                  <div className="text-xs text-gray-400 italic">
                    Delivered automatically
                  </div>
                )}
                {r.note && (
                  <p className="text-[11px] text-gray-400 mt-2">{r.note}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
