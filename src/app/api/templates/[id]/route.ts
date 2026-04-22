/**
 * Per-template CRUD for MailerTemplate.
 * GET    /api/templates/:id  — any logged-in user
 * PATCH  /api/templates/:id  — admin only
 * DELETE /api/templates/:id  — admin only (soft delete: isActive=false)
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });
  const tpl = await prisma.mailerTemplate.findUnique({ where: { id } });
  if (!tpl) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(tpl);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();
  const allowed = [
    "name",
    "category",
    "size",
    "thumbnailUrl",
    "htmlTemplate",
    "variables",
    "pricePerPiece",
    "minQuantity",
    "isActive",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  const tpl = await prisma.mailerTemplate.update({ where: { id }, data });
  return NextResponse.json(tpl);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  // Soft delete — existing orders may reference it via mailerTemplateId
  await prisma.mailerTemplate.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
