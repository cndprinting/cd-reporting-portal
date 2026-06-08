/**
 * Industry-specific landing page. Renders any industry from src/lib/industries.ts
 * at /industries/[slug]. Each page features industry-tailored hero, pain,
 * "why MailerCity", use cases, rate card preview, and a quote form whose
 * "What are you mailing?" textarea is pre-filled with industry context.
 */

import { notFound } from "next/navigation";
import { getIndustry, INDUSTRIES, type Industry } from "@/lib/industries";
import { ALL_TIERS, POSTAGE_PER_UNIT, EFFECTIVE_DATE } from "@/lib/services/rate-card";
import { IndustryPage } from "@/components/landing/industry-page";
import prisma from "@/lib/prisma";
import type { TemplateCardData } from "@/components/templates/template-card";

// Revalidate so admin template adds show up without a full redeploy.
export const revalidate = 60;

export async function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ind: Industry | null = getIndustry(slug);
  if (!ind) return { title: "Not found — MailerCity" };
  return {
    title: `${ind.nav} Direct Mail — MailerCity by C&D Printing`,
    description: ind.tagline,
  };
}

export default async function IndustryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ind = getIndustry(slug);
  if (!ind) notFound();

  const tiers = ind.pricing === "postcards" ? ALL_TIERS.postcards : ALL_TIERS.letters;
  const sizes =
    ind.pricing === "postcards"
      ? ["4.25x6", "6x8.5", "6x11"]
      : ["1-Sheet", "2-Sheet"];

  // Fetch templates tagged to this industry so they appear inline on the
  // persona landing page (alongside hero / pricing / form). Same data and
  // styling as /templates — just filtered.
  const templates: TemplateCardData[] = prisma
    ? await prisma.mailerTemplate.findMany({
        where: { isActive: true, industry: ind.slug },
        orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          shortCode: true,
          category: true,
          size: true,
          thumbnailUrl: true,
          frontImageUrl: true,
          htmlTemplate: true,
          description: true,
          offerHook: true,
          pricePerPiece: true,
          postageIncluded: true,
          minQuantity: true,
          featured: true,
        },
      })
    : [];

  return (
    <IndustryPage
      industry={ind}
      pricing={{ tiers, sizes, postage: POSTAGE_PER_UNIT, effective: EFFECTIVE_DATE }}
      templates={templates}
    />
  );
}
