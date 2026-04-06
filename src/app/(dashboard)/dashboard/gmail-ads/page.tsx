"use client";

import { Inbox } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";

export default function GmailAdsPage() {
  return <ChannelPage channelType="GMAIL_ADS" title="Gmail Ads" icon={Inbox} />;
}
