/**
 * Order list + create endpoints.
 *
 * GET  /api/orders            — list (admin: all; customer: own company only)
 * POST /api/orders            — create (admin/rep only)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateOrderCode } from "@/lib/services/order-codes";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ orders: [] });

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") || undefined;
  const companyFilter = url.searchParams.get("companyId") || undefined;

  const where: Record<string, unknown> = {};
  // Customers only see their own company's orders
  if (session.role === "CUSTOMER") {
    where.companyId = session.companyId;
  } else if (companyFilter) {
    where.companyId = companyFilter;
  }
  if (statusFilter) where.status = statusFilter;

  const orders = await prisma.order.findMany({
    where,
    include: {
      company: { select: { id: true, name: true, logoUrl: true } },
      campaign: { select: { id: true, name: true, campaignCode: true } },
      proof: { select: { pdfUrl: true, uploadedAt: true } },
      approval: { select: { approvedAt: true, approvedByName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const body = await req.json();
  const {
    companyId: rawCompanyId,
    campaignId,
    description,
    quantity,
    dropDate,
    mailClass,
    mailShape,
    pricePerPiece,
    setupFee,
    totalPrice,
  } = body;

  // Customers can only create orders for their own company
  let companyId = rawCompanyId;
  if (session.role === "CUSTOMER") {
    companyId = session.companyId;
  } else if (!companyId) {
    return NextResponse.json({ error: "companyId required for admin-created orders" }, { status: 400 });
  }

  if (!campaignId || !quantity) {
    return NextResponse.json(
      { error: "campaignId and quantity are required" },
      { status: 400 },
    );
  }

  const orderCode = await generateOrderCode(companyId);
  const order = await prisma.order.create({
    data: {
      orderCode,
      companyId,
      campaignId,
      description,
      quantity,
      dropDate: dropDate ? new Date(dropDate) : null,
      mailClass,
      mailShape,
      pricePerPiece,
      setupFee,
      totalPrice: totalPrice ?? (pricePerPiece && quantity ? pricePerPiece * quantity : null),
      createdBy: session.id,
      status: "DRAFT",
    },
    include: {
      company: { select: { name: true } },
      campaign: { select: { name: true, campaignCode: true } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
