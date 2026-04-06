import { NextRequest, NextResponse } from "next/server";
import { getDemoMetrics } from "@/lib/demo-data";
import { formatDate, getChannelLabel } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const channel = searchParams.get("channel");
  const format = searchParams.get("format") || "csv";

  let metrics = getDemoMetrics();
  if (campaignId) metrics = metrics.filter((m) => m.campaignId === campaignId);
  if (channel) metrics = metrics.filter((m) => m.channel === channel);

  if (format === "csv") {
    const headers = [
      "Date", "Channel", "Impressions", "Clicks", "Leads", "Calls",
      "Qualified Calls", "Conversions", "Spend", "Pieces Delivered", "QR Scans",
    ];
    const rows = metrics.map((m) => [
      formatDate(m.date),
      getChannelLabel(m.channel),
      m.impressions,
      m.clicks,
      m.leads,
      m.calls,
      m.qualifiedCalls,
      m.conversions,
      m.spend.toFixed(2),
      m.piecesDelivered,
      m.qrScans,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="cd-report-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
