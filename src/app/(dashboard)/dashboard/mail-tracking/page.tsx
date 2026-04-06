"use client";

import { Mail } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";

export default function MailTrackingPage() {
  return <ChannelPage channelType="MAIL_TRACKING" title="Mail Tracking" icon={Mail} />;
}
