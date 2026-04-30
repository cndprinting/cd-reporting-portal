/**
 * Admin: list orders awaiting AccuZIP processing.
 *
 * GET /api/admin/production-queue
 *   Returns orders that:
 *     - have a recipient list attached (mailingListUrl is set)
 *     - haven't completed production yet (status not in DROPPED/DELIVERING/COMPLETE/CANCELLED)
 *     - belong to an active company
 *
 * Each row includes the most recent production handoff (if any) so the UI
 * can show "Sent to Tom 2 days ago" or "Not sent yet."
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getDefaultProductionRecipients } from "@/lib/services/production-notify";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const orders = await prisma.order.findMany({
    where: {
      mailingListUrl: { not: null },
      status: {
        notIn: ["DROPPED", "DELIVERING", "COMPLETE", "CANCELLED"] as const,
      },
      company: { isActive: true },
    },
    include: {
      company: { select: { id: true, name: true } },
      campaign: { select: { name: true, campaignCode: true } },
      productionHandoffs: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { recipients: true, sentAt: true, notes: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    orders,
    defaultRecipients: getDefaultProductionRecipients(),
  });
}
