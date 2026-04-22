/**
 * Admin list + resolve of unknown IMbs (scan events for IMbs not in our DB).
 *
 * GET  /api/admin/unknown-imbs?status=unresolved|all
 *   -> list (paginated — first 200)
 *
 * POST /api/admin/unknown-imbs
 *   body: { action: "resolve" | "dismiss", ids: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

async function requireAdmin() {
  const s = await getSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "ACCOUNT_MANAGER")) return null;
  return s;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const status = new URL(req.url).searchParams.get("status") ?? "unresolved";
  const where = status === "all" ? {} : { isResolved: false };

  const [items, counts] = await Promise.all([
    prisma.unknownImb.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      take: 200,
    }),
    prisma.unknownImb.groupBy({
      by: ["isResolved"],
      _count: { _all: true },
    }),
  ]);

  const unresolved = counts.find((c) => !c.isResolved)?._count._all ?? 0;
  const resolved = counts.find((c) => c.isResolved)?._count._all ?? 0;

  return NextResponse.json({ items, unresolved, resolved });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const action: "resolve" | "dismiss" = body.action;
  if (ids.length === 0) return NextResponse.json({ error: "no ids" }, { status: 400 });

  if (action === "resolve") {
    await prisma.unknownImb.updateMany({
      where: { id: { in: ids } },
      data: { isResolved: true, resolvedAt: new Date() },
    });
  } else if (action === "dismiss") {
    // Delete entirely — admin considered these truly not ours
    await prisma.unknownImb.deleteMany({ where: { id: { in: ids } } });
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: ids.length });
}
