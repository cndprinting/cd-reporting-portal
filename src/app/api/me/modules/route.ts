/**
 * GET /api/me/modules
 *   Returns the list of persona modules enabled for the current user's company.
 *   Admins see no modules by default (they're not running mailings as a customer);
 *   if they want to test/preview a module, they can use the ?as=<companyId> query
 *   param to act-as that company.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ enabledModules: [] });
  if (!prisma) return NextResponse.json({ enabledModules: [] });

  const asCompanyId = req.nextUrl.searchParams.get("as");

  // Admins can preview any company's modules via ?as=
  let companyId: string | null = session.companyId;
  if (asCompanyId && session.role !== "CUSTOMER") {
    companyId = asCompanyId;
  }

  if (!companyId) return NextResponse.json({ enabledModules: [] });

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { enabledModules: true },
  });

  return NextResponse.json({
    enabledModules: company?.enabledModules ?? [],
  });
}
