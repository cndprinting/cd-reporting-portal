"use client";

import { Share2 } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";

export default function FacebookAdsPage() {
  return <ChannelPage channelType="FACEBOOK_ADS" title="Facebook & Instagram Ads" icon={Share2} />;
}
