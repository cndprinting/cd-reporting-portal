import { NextRequest, NextResponse } from "next/server";
import { getChannelKPIs, getAggregatedKPIs, getTimeSeriesData, getDemoMetrics } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "overview";
  const channel = searchParams.get("channel");
  const campaignId = searchParams.get("campaignId");

  const campaignIds = campaignId ? [campaignId] : undefined;

  switch (type) {
    case "overview":
      return NextResponse.json({
        totals: getAggregatedKPIs(campaignIds),
        channelKpis: getChannelKPIs(campaignIds),
        timeSeries: getTimeSeriesData(campaignIds),
      });

    case "channel":
      if (!channel) {
        return NextResponse.json({ error: "Channel parameter required" }, { status: 400 });
      }
      const metrics = getDemoMetrics().filter(
        (m) => m.channel === channel && (!campaignId || m.campaignId === campaignId)
      );
      return NextResponse.json({ metrics });

    case "timeseries":
      return NextResponse.json({ data: getTimeSeriesData(campaignIds) });

    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
