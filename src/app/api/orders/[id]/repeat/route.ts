/**
 * Repeat a previous Order with one click.
 * POST /api/orders/:id/repeat
 *
 * Creates a new DRAFT Order cloned from the source (same customer, campaign,
 * quantity, pricing, mail class/shape). Drop date, proof, approval, and
 * payment reset — new order starts fresh in DRAFT.
 *
 * Customer can trigger for their own orders; admin can for anyone.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateOrderCode } from "@/lib/services/order-codes";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const src = await prisma.order.findUnique({ where: { id } });
  if (!src) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Customers can only repeat their own company's orders
  if (session.role === "CUSTOMER" && src.companyId !== session.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const newCode = await generateOrderCode(src.companyId);
  const newOrder = await prisma.order.create({
    data: {
      orderCode: newCode,
      companyId: src.companyId,
      campaignId: src.campaignId,
      description: src.description ? `${src.description} (repeat)` : "Repeat mailing",
      quantity: src.quantity,
      mailClass: src.mailClass,
      mailShape: src.mailShape,
      pricePerPiece: src.pricePerPiece,
      setupFee: 0, // setup fee usually one-time, don't charge again
      totalPrice: src.pricePerPiece ? src.pricePerPiece * src.quantity : null,
      createdBy: session.id,
      status: "DRAFT",
      packageId: src.packageId, // inherit package draw setting
    },
  });

  return NextResponse.json(newOrder, { status: 201 });
}
