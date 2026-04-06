"use client";

import { Target } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";

export default function BehavioralAdsPage() {
  return <ChannelPage channelType="BEHAVIORAL_ADS" title="Behavioral Ads" icon={Target} />;
}
