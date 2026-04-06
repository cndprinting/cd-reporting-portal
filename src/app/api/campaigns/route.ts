import { NextRequest, NextResponse } from "next/server";
import { demoCampaigns, getDemoMetrics, getChannelKPIs, getAggregatedKPIs } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("id");
  const companyId = searchParams.get("companyId");

  if (campaignId) {
    const campaign = demoCampaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const metrics = getDemoMetrics().filter((m) => m.campaignId === campaignId);
    const channelKpis = getChannelKPIs([campaignId]);
    const totals = getAggregatedKPIs([campaignId]);

    return NextResponse.json({ campaign, metrics, channelKpis, totals });
  }

  let campaigns = demoCampaigns;
  if (companyId) {
    campaigns = campaigns.filter((c) => c.companyId === companyId);
  }

  return NextResponse.json({ campaigns });
}
