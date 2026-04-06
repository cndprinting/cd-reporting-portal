"use client";

import { QrCode } from "lucide-react";
import { ChannelPage } from "@/components/dashboard/channel-page";

export default function QRCodesPage() {
  return <ChannelPage channelType="QR_CODES" title="QR Codes" icon={QrCode} />;
}
