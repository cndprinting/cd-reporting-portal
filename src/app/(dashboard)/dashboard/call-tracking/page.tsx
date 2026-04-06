"use client";

import { Phone } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";

export default function CallTrackingPage() {
  return <ChannelPage channelType="CALL_TRACKING" title="Call Tracking" icon={Phone} />;
}
