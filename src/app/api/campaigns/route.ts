/**
 * Campaign CRUD.
 * GET  /api/campaigns              — list (admin: all; customer: own company)
 * POST /api/campaigns              — create (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ campaigns: [] });
  if (!prisma) return NextResponse.json({ campaigns: [] });

  const { searchParams } = new URL(request.url);
  const companyIdParam = searchParams.get("companyId");

  const where: Record<string, unknown> = {};
  if (session.role === "CUSTOMER") {
    where.companyId = session.companyId;
  } else if (companyIdParam) {
    where.companyId = companyIdParam;
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { orders: true, mailPieces: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const body = await request.json();
  const { name, description, campaignCode, destinationUrl, status } = body;
  let { companyId } = body;

  // Customers can only create campaigns for their own company. Force the
  // companyId to their session's companyId (ignore whatever they sent).
  if (session.role === "CUSTOMER") {
    if (!session.companyId) {
      return NextResponse.json({ error: "no company on session" }, { status: 400 });
    }
    companyId = session.companyId;
  }

  if (!name || !companyId) {
    return NextResponse.json({ error: "name and companyId required" }, { status: 400 });
  }

  const year = new Date().getFullYear();
  let code = campaignCode;
  if (!code) {
    const count = await prisma.campaign.count();
    code = `CD-${year}-${String(count + 1).padStart(3, "0")}`;
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      companyId,
      description,
      campaignCode: code,
      destinationUrl,
      status: status ?? "DRAFT",
    },
    include: { company: { select: { id: true, name: true } } },
  });

  return NextResponse.json(campaign, { status: 201 });
}
