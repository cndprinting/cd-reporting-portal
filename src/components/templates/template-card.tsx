"use client";

/**
 * Single template gallery card. Same visual on both the main /templates
 * page and the per-industry landing pages so the template inventory feels
 * coherent across the public site.
 */

import Link from "next/link";
import { TemplatePreview } from "./template-preview";
import { SamplesButton } from "./samples-button";

export interface TemplateCardData {
  id: string;
  name: string;
  shortCode: string | null;
  category: string;
  size: string;
  thumbnailUrl: string | null;
  frontImageUrl: string | null;
  htmlTemplate: string;
  description: string | null;
  offerHook: string | null;
  pricePerPiece: number;
  postageIncluded: boolean;
  minQuantity: number;
  featured: boolean;
}

export function TemplateCard({ t }: { t: TemplateCardData }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm hover:shadow-md transition-shadow">
      <TemplatePreview
        frontImageUrl={t.frontImageUrl ?? t.thumbnailUrl}
        html={t.htmlTemplate}
        aspect={t.category === "letter" ? "letter" : "postcard"}
      />
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg text-ink leading-tight">{t.name}</h3>
            {t.shortCode && (
              <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-stone">
                {t.shortCode}
              </div>
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
        <div className="mt-4 text-xs text-stone">
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
  );
}
