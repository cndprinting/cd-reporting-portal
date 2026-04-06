import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatCurrency(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPercent(num: number): string {
  return `${num.toFixed(1)}%`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getChannelLabel(channel: string): string {
  const labels: Record<string, string> = {
    MAIL_TRACKING: "Mail Tracking",
    CALL_TRACKING: "Call Tracking",
    GOOGLE_ADS: "Google Ads",
    FACEBOOK_ADS: "Facebook & Instagram Ads",
    BEHAVIORAL_ADS: "Behavioral Ads",
    GMAIL_ADS: "Gmail Ads",
    YOUTUBE_ADS: "YouTube Ads",
    QR_CODES: "QR Codes",
  };
  return labels[channel] || channel;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    LIVE: "bg-emerald-100 text-emerald-700",
    PAUSED: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-slate-100 text-slate-600",
    DRAFT: "bg-blue-100 text-blue-700",
  };
  return colors[status] || "bg-gray-100 text-gray-600";
}
