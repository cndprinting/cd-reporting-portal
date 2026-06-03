import type { ReactNode } from "react";
import Script from "next/script";

/**
 * Public-marketing layout.
 *
 * Loads Google Tag Manager (container GTM-MMZH38QL) for the C&D PPC team's
 * Meta Ads conversion tracking + Stape.io server-side pipeline. Scoped to this
 * route group so GTM never loads on the authenticated dashboard — keeps
 * tracking off customer-facing app activity, matches the agency's scope
 * ("marketing.cndprinting.com only"), and keeps the privacy story clean.
 *
 * The actual events (page_view, lead_submit, phone_click, etc.) and their
 * downstream destinations (Meta CAPI, GA, etc.) are configured by the PPC
 * team inside the GTM dashboard. From the codebase side we just:
 *   - ship the loader (this file)
 *   - push semantic events into window.dataLayer (see src/lib/analytics.ts)
 *   - mark phone numbers as tel: links with class="phone-link" so GTM can
 *     listen for clicks
 */

const GTM_ID = "GTM-MMZH38QL";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* GTM loader — injected into <head> by next/script. */}
      <Script
        id="gtm-loader"
        strategy="afterInteractive"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />

      {/* GTM noscript fallback — works without JS. */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>

      {children}
    </>
  );
}
