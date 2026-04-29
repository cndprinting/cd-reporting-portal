/**
 * Per-company CRUD.
 * PATCH  /api/companies/:id  — admin only. Whitelist of editable fields.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await req.json();

  // Whitelist editable fields
  const allowed = [
    "name",
    "industry",
    "website",
    "address",
    "phone",
    "logoUrl",
    "brandPrimary",
    "brandAccent",
    "brandTagline",
    "externalCustomerId",
    "isActive",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no editable fields in body" }, { status: 400 });
  }

  const updated = await prisma.company.update({ where: { id }, data });
  return NextResponse.json(updated);
}
