/**
 * Front-end analytics helpers — push events into the Google Tag Manager
 * dataLayer. Our PPC team configures the actual destinations (Meta Conversions
 * API via Stape.io, Google Ads, etc.) on top of these events inside GTM, so
 * adding a new conversion destination is a config change there — not a code
 * change here.
 *
 * Events we currently fire:
 *   lead_submit  — user submitted the quote/contact form on a public page.
 */

type DataLayerEvent = {
  event: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

function push(event: DataLayerEvent) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

/** Lead-form submission. `meta` lets us tag the source page / industry. */
export function trackLead(meta?: Record<string, string>) {
  push({ event: "lead_submit", ...(meta ?? {}) });
}
