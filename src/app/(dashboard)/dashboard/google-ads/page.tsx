"use client";

import { Globe } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";

export default function GoogleAdsPage() {
  return <ChannelPage channelType="GOOGLE_ADS" title="Google Ads" icon={Globe} />;
}
