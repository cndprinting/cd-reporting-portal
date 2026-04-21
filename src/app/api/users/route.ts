/**
 * Admin: list users.
 * GET /api/users            — all users (admin only)
 * GET /api/users?companyId= — filter by company
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
  if (!prisma) return NextResponse.json({ users: [] });

  const companyId = new URL(req.url).searchParams.get("companyId") || undefined;

  const users = await prisma.user.findMany({
    where: companyId ? { companyId } : {},
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}
