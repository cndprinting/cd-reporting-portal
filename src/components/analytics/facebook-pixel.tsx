"use client";

import Script from "next/script";

/**
 * Facebook (Meta) Pixel — loaded only when NEXT_PUBLIC_FB_PIXEL_ID is set.
 * Mount in the root layout so it runs on every page.
 *
 * To fire a custom event from any component:
 *   window.fbq?.("track", "Lead");
 *
 * Standard events worth using:
 *   "PageView"  — automatic, fires on mount
 *   "Lead"      — fire on form submit success
 *   "Contact"   — fire on contact-form opens, phone clicks
 *   "InitiateCheckout" — fire when /orders/new is opened
 *   "Purchase"  — fire when order is paid
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export function FacebookPixel() {
  if (!PIXEL_ID) return null;
  return (
    <>
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
        `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

/** Helper to fire a Lead event from form-submit handlers. */
export function trackLead(meta?: Record<string, string>) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
  if (typeof fbq === "function") {
    fbq("track", "Lead", meta ?? {});
  }
}
