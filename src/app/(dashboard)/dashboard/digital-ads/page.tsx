"use client";

/**
 * Consolidated "Digital Ads" page.
 * Replaces 5 separate sidebar tabs (Google, Facebook, YouTube, Gmail, Behavioral)
 * with a single page and in-page tab switcher.
 */

import { useState } from "react";
import { Megaphone, Globe, Share2, Video, Inbox, Target } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "GOOGLE_ADS", label: "Google", icon: Globe },
  { key: "FACEBOOK_ADS", label: "Facebook", icon: Share2 },
  { key: "YOUTUBE_ADS", label: "YouTube", icon: Video },
  { key: "GMAIL_ADS", label: "Gmail", icon: Inbox },
  { key: "BEHAVIORAL_ADS", label: "Behavioral", icon: Target },
] as const;

export default function DigitalAdsPage() {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("GOOGLE_ADS");
  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Digital Ads</h1>
          <p className="text-sm text-gray-500">
            Performance across all advertising channels
          </p>
        </div>
      </div>

      {/* Channel tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((t) => {
            const isActive = active === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors whitespace-nowrap",
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

      {/* Selected channel's content */}
      <ChannelPage channelType={active} title={`${activeTab.label} Ads`} icon={activeTab.icon} />
    </div>
  );
}
