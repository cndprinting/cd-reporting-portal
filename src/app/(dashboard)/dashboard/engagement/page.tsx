"use client";

/**
 * Consolidated "Engagement" page.
 * Replaces separate Call Tracking and QR Codes tabs with one page + channel tabs.
 */

import { useState } from "react";
import { Phone, QrCode } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "CALL_TRACKING", label: "Phone Calls", icon: Phone },
  { key: "QR_CODES", label: "QR Scans", icon: QrCode },
] as const;

export default function EngagementPage() {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("CALL_TRACKING");
  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Phone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engagement</h1>
          <p className="text-sm text-gray-500">
            Inbound responses from phone calls and QR code scans
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-1 -mb-px">
          {TABS.map((t) => {
            const isActive = active === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <ChannelPage channelType={active} title={activeTab.label} icon={activeTab.icon} />
    </div>
  );
}
