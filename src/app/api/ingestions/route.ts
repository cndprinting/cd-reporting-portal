/**
 * Admin list of recent IV-MTR ingestion runs.
 * GET /api/ingestions?limit=50
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!prisma) {
    // Demo fallback
    const now = Date.now();
    return NextResponse.json({
      ingestions: Array.from({ length: 10 }).map((_, i) => ({
        id: `demo-ing-${i}`,
        source: i % 3 === 0 ? "iv-mtr-push" : "iv-mtr-pull",
        fileName: `scans-${new Date(now - i * 1800_000).toISOString()}.json`,
        recordsReceived: 850 + Math.floor(Math.random() * 400),
        recordsInserted: 820 + Math.floor(Math.random() * 380),
        recordsSkipped: Math.floor(Math.random() * 20),
        status: i === 1 ? "FAILED" : "COMPLETED",
        errorMessage: i === 1 ? "Connection timeout talking to IV-MTR" : null,
        startedAt: new Date(now - i * 1800_000).toISOString(),
        completedAt: new Date(now - i * 1800_000 + 8_000).toISOString(),
      })),
      lastCompletedAt: new Date(now - 1200_000).toISOString(),
    });
  }

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get("limit") ?? "50", 10), 200);
  const ingestions = await prisma.iVFeedIngestion.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  const lastCompleted = ingestions.find((i) => i.status === "COMPLETED");

  return NextResponse.json({
    ingestions,
    lastCompletedAt: lastCompleted?.completedAt ?? null,
  });
}
