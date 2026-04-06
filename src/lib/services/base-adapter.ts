// Base adapter pattern for swappable data sources
// Each channel service implements this interface

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MetricRow {
  date: string;
  impressions: number;
  clicks: number;
  leads: number;
  calls: number;
  qualifiedCalls: number;
  conversions: number;
  spend: number;
  piecesDelivered: number;
  qrScans: number;
}

export interface ChannelSummary {
  totalImpressions: number;
  totalClicks: number;
  totalLeads: number;
  totalSpend: number;
  ctr: number;
  conversionRate: number;
}

export interface DataAdapter {
  getMetrics(campaignId: string, dateRange?: DateRange): Promise<MetricRow[]>;
  getSummary(campaignId: string, dateRange?: DateRange): Promise<ChannelSummary>;
}

// Factory for creating adapters - swap implementations here
export type AdapterType =
  | "mail-tracking"
  | "call-tracking"
  | "google-ads"
  | "facebook-ads"
  | "behavioral-ads"
  | "gmail-ads"
  | "youtube-ads"
  | "qr-codes";

// Placeholder: in production, swap with real API adapters
export function createAdapter(_type: AdapterType): DataAdapter {
  // For now, all adapters use demo data
  // Replace with real implementations:
  // case 'google-ads': return new GoogleAdsAdapter(config);
  // case 'facebook-ads': return new MetaAdsAdapter(config);
  // etc.
  return {
    async getMetrics() {
      return [];
    },
    async getSummary() {
      return {
        totalImpressions: 0,
        totalClicks: 0,
        totalLeads: 0,
        totalSpend: 0,
        ctr: 0,
        conversionRate: 0,
      };
    },
  };
}
