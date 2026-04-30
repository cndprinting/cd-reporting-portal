/**
 * Single-order CRUD.
 * GET   /api/orders/:id   — read (admin all, customer own company only)
 * PATCH /api/orders/:id   — update fields / move status (admin only)
 * DELETE /api/orders/:id  — delete (admin only, soft prefer — uses CANCELLED status)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

async function loadOrder(id: string) {
  if (!prisma) return null;
  return prisma.order.findUnique({
    where: { id },
    include: {
      company: true,
      campaign: { select: { id: true, name: true, campaignCode: true } },
      proof: true,
      approval: true,
      package: { select: { id: true, name: true, totalPieces: true, usedPieces: true } },
      drawdowns: true,
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await loadOrder(id);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Customers can only see their own company's orders
  if (session.role === "CUSTOMER" && order.companyId !== session.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  // Customers can only patch their own company's orders, and only certain fields
  if (session.role === "CUSTOMER") {
    const order = await prisma.order.findUnique({ where: { id }, select: { companyId: true } });
    if (!order || order.companyId !== session.companyId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  // Admins can change everything. Customers can only change list attachment.
  const adminFields = [
    "description",
    "quantity",
    "dropDate",
    "mailClass",
    "mailShape",
    "pricePerPiece",
    "setupFee",
    "totalPrice",
    "status",
    "packageId",
    "mailingListUrl",
    "mailingListFileName",
  ];
  const customerFields = ["mailingListUrl", "mailingListFileName"];
  const allowedFields =
    session.role === "CUSTOMER" ? customerFields : adminFields;

  const updatable: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      if (field === "dropDate" && body[field]) updatable[field] = new Date(body[field]);
      else updatable[field] = body[field];
    }
  }
  if ("mailingListUrl" in body) {
    updatable.mailingListUploadedAt = body.mailingListUrl ? new Date() : null;
  }

  // If transitioning to DROPPED, stamp droppedAt
  if (body.status === "DROPPED") {
    updatable.droppedAt = new Date();
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updatable,
  });

  // Production handoff is now manual — admin clicks "Send to Production" on
  // the queue page rather than auto-emailing. See /api/admin/production-queue
  // and /api/orders/:id/send-to-production.

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  // Soft-delete via status
  const updated = await prisma.order.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json(updated);
}
