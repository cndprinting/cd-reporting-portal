/**
 * API key management (admin only).
 *
 * GET  /api/api-keys?companyId=xxx — list keys for a company
 * POST /api/api-keys                — create: { companyId, name, scopes?, expiresAt? }
 *                                     returns raw key ONCE
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateApiKey } from "@/lib/services/api-keys";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const companyId = new URL(req.url).searchParams.get("companyId");
  const keys = await prisma.apiKey.findMany({
    where: companyId ? { companyId } : {},
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyId: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const { companyId, name, scopes, expiresAt } = await req.json();
  if (!companyId || !name) {
    return NextResponse.json({ error: "companyId and name required" }, { status: 400 });
  }

  const { raw, prefix, hash } = generateApiKey();
  const key = await prisma.apiKey.create({
    data: {
      companyId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: scopes ?? "read:tracking",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: session.id,
    },
  });

  // Raw key returned ONCE — client must save it
  return NextResponse.json({
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    rawKey: raw,
    warning: "Save this key now — it will never be shown again.",
  });
}
