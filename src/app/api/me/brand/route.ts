/**
 * What brand should we render for the current user?
 * GET /api/me/brand
 *   Admins + non-customer roles → C&D default brand
 *   Customers → their company's brand (logoUrl, primary, accent, name, tagline)
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const DEFAULT_BRAND = {
  companyName: "cndprinting.com",
  tagline: "Reporting Portal",
  logoUrl: null as string | null,
  primary: "#0284c7", // brand-600
  accent: "#f59e0b",
  isCustomerBranded: false,
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(DEFAULT_BRAND);

  // Admins always see C&D brand
  if (session.role !== "CUSTOMER") return NextResponse.json(DEFAULT_BRAND);

  if (!prisma || !session.companyId) return NextResponse.json(DEFAULT_BRAND);

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: {
      name: true,
      logoUrl: true,
      brandPrimary: true,
      brandAccent: true,
      brandTagline: true,
    },
  });
  if (!company) return NextResponse.json(DEFAULT_BRAND);

  return NextResponse.json({
    companyName: company.name,
    tagline: company.brandTagline ?? "Campaign Reporting",
    logoUrl: company.logoUrl,
    primary: company.brandPrimary ?? DEFAULT_BRAND.primary,
    accent: company.brandAccent ?? DEFAULT_BRAND.accent,
    isCustomerBranded: true,
  });
}
