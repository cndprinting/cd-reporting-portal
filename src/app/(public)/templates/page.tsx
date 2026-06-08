/**
 * Public template gallery — marketing.cndprinting.com/templates
 *
 * The shopfront. Anyone (logged in or not) browses pre-made mailer templates,
 * filtered by industry. Each card shows pricing UP FRONT (the differentiator
 * vs Rocket Prints / PCM, who hide it) and routes to Customize-and-Order
 * (signup-gated) plus a secondary "Get free samples" lead capture.
 *
 * Server component — queries DB at request time so admin updates show up
 * immediately without a redeploy.
 */

import Link from "next/link";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { INDUSTRIES } from "@/lib/industries";
import { SamplesButton } from "@/components/templates/samples-button";
import { TemplatePreview } from "@/components/templates/template-preview";

export const revalidate = 60; // refresh from DB at most once a minute

interface PageProps {
  searchParams: Promise<{ industry?: string }>;
}

export default async function TemplatesGalleryPage({ searchParams }: PageProps) {
  const { industry: filterIndustry } = await searchParams;

  const templates = prisma
    ? await prisma.mailerTemplate.findMany({
        where: {
          isActive: true,
          ...(filterIndustry ? { industry: filterIndustry } : {}),
        },
        orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
      })
    : [];

  // Industry counts for the filter pills
  const allCounts = prisma
    ? await prisma.mailerTemplate.groupBy({
        by: ["industry"],
        where: { isActive: true },
        _count: true,
      })
    : [];
  const totalCount = allCounts.reduce((s, r) => s + r._count, 0);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl text-ink">
            MailerCity <span className="text-stone text-sm">by C&amp;D Printing</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/case-studies" className="text-stone hover:text-ink">Case studies</Link>
            <Link href="/templates" className="text-ink font-medium">Templates</Link>
            <Link href="/login" className="text-stone hover:text-ink">Sign in</Link>
            <Link href="/signup" className="rounded bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700">Start an order</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-2 text-xs font-mono uppercase tracking-[0.2em] text-stone">
          Mailer Template Library
        </div>
        <h1 className="text-4xl font-display text-ink">
          Pre-built mailers, ready to send.
        </h1>
        <p className="mt-2 text-stone max-w-2xl">
          Pick a template, upload your list, and we mail it — postage included, USPS-tracked.
          Designed for land investors, real estate, nonprofits, and direct-response businesses.
          New templates added regularly.
        </p>

        {/* Industry filter pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href="/templates"
            className={`rounded-full border px-3 py-1.5 text-sm ${
              !filterIndustry
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-line bg-white text-stone hover:border-stone"
            }`}
          >
            All ({totalCount})
          </Link>
          {INDUSTRIES.map((ind) => {
            const count = allCounts.find((c) => c.industry === ind.slug)?._count ?? 0;
            if (count === 0) return null;
            return (
              <Link
                key={ind.slug}
                href={`/templates?industry=${ind.slug}`}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  filterIndustry === ind.slug
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-line bg-white text-stone hover:border-stone"
                }`}
              >
                {ind.nav} ({count})
              </Link>
            );
          })}
        </div>

        {/* Gallery */}
        {templates.length === 0 ? (
          <div className="mt-12 rounded-lg border border-line bg-white p-12 text-center text-stone">
            No templates in this category yet.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <article
                key={t.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <Suspense fallback={<div className="h-56 bg-paper-soft" />}>
                  <TemplatePreview
                    frontImageUrl={t.frontImageUrl ?? t.thumbnailUrl}
                    html={t.htmlTemplate}
                    aspect={t.category === "letter" ? "letter" : "postcard"}
                  />
                </Suspense>

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg text-ink leading-tight">{t.name}</h3>
                      {t.shortCode && (
                        <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-stone">{t.shortCode}</div>
                      )}
                    </div>
                    {t.featured && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                        FEATURED
                      </span>
                    )}
                  </div>
                  {t.offerHook && (
                    <div className="mt-1 text-sm font-medium text-brand-700">{t.offerHook}</div>
                  )}
                  {t.description && (
                    <p className="mt-2 text-sm text-stone line-clamp-3">{t.description}</p>
                  )}

                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <span className="text-2xl font-display text-ink">
                      ${t.pricePerPiece.toFixed(2)}
                    </span>
                    <span className="text-stone">/piece</span>
                    {t.postageIncluded && (
                      <span className="ml-auto rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        POSTAGE INCLUDED
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-stone">
                    {t.category === "letter" ? "Letter · " : "Postcard · "}
                    {t.size} · Min {t.minQuantity.toLocaleString()} pieces
                  </div>
                </div>

                <div className="border-t border-line bg-paper-soft p-3 flex gap-2">
                  <Link
                    href={`/signup?template=${t.id}`}
                    className="flex-1 rounded bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Customize &amp; order
                  </Link>
                  <SamplesButton templateName={t.name} templateShortCode={t.shortCode ?? undefined} />
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Bottom trust strip */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-sm">
          <div>
            <div className="text-2xl font-display text-ink">USPS tracked</div>
            <div className="text-stone">Live scan-level delivery</div>
          </div>
          <div>
            <div className="text-2xl font-display text-ink">Postage in</div>
            <div className="text-stone">One price per piece, no surprises</div>
          </div>
          <div>
            <div className="text-2xl font-display text-ink">5 minutes</div>
            <div className="text-stone">From upload to scheduled drop</div>
          </div>
          <div>
            <div className="text-2xl font-display text-ink">C&amp;D Printing</div>
            <div className="text-stone">St. Petersburg, FL</div>
          </div>
        </div>
      </section>
    </div>
  );
}
