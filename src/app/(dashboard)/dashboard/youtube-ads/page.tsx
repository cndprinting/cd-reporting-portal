"use client";

import { Video } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";

export default function YouTubeAdsPage() {
  return <ChannelPage channelType="YOUTUBE_ADS" title="YouTube Ads" icon={Video} />;
}
