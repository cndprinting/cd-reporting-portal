/**
 * Admin list of companies.
 * GET /api/companies?include=reportSettings
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
  if (!prisma) {
    // Demo fallback
    return NextResponse.json({
      companies: [
        {
          id: "demo-company-1",
          name: "C&D Printing Demo Account",
          weeklyReportEnabled: true,
          weeklyReportRecipients: null,
          lastWeeklyReportAt: null,
          users: [{ email: "admin@cndprinting.com", name: "Sarah Johnson" }],
        },
        {
          id: "demo-company-2",
          name: "Sunshine Realty Group",
          weeklyReportEnabled: true,
          weeklyReportRecipients: null,
          lastWeeklyReportAt: null,
          users: [{ email: "john@sunshinerealty.com", name: "John Rivera" }],
        },
        {
          id: "demo-company-3",
          name: "Palm Coast Insurance",
          weeklyReportEnabled: false,
          weeklyReportRecipients: "ops@palmcoastins.com",
          lastWeeklyReportAt: null,
          users: [],
        },
      ],
    });
  }

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      externalCustomerId: true,
      weeklyReportEnabled: true,
      weeklyReportRecipients: true,
      lastWeeklyReportAt: true,
      logoUrl: true,
      brandPrimary: true,
      brandAccent: true,
      brandTagline: true,
      users: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const body = await req.json();
  const { name, industry, website, address, phone, externalCustomerId } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  if (!baseSlug) baseSlug = "customer";

  // Ensure unique slug
  let slug = baseSlug;
  let n = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    n++;
    slug = `${baseSlug}-${n}`;
  }

  try {
    const company = await prisma.company.create({
      data: {
        name,
        slug,
        industry,
        website,
        address,
        phone,
        externalCustomerId: externalCustomerId || null,
      },
    });
    return NextResponse.json(company, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
