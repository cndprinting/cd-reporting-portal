/**
 * Admin one-shot — marks any IVFeedIngestion stuck in PROCESSING status
 * (older than 5 minutes — past Vercel's function timeout) as COMPLETED.
 *
 * POST /api/admin/unstick-ingestions
 *
 * Used to clean up the dashboard after a slow ingestion bug. Safe to re-run.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const result = await prisma.iVFeedIngestion.updateMany({
    where: { status: "PROCESSING", startedAt: { lt: cutoff } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  return NextResponse.json({ ok: true, unstuck: result.count });
}
