"use client";

/**
 * Render a template preview inside a fixed aspect-ratio box.
 *
 * If the admin has uploaded a real `frontImageUrl` (designer artwork), we show
 * that. Otherwise we render the htmlTemplate directly — it has the inline
 * styles needed to fill the box and gives an honest preview of what the
 * customer's mailer will look like once variables are merged.
 */

interface Props {
  frontImageUrl: string | null;
  html: string;
  aspect: "postcard" | "letter";
}

// Replace {{var}} placeholders with sample data so the preview shows real-
// looking content instead of empty braces. Keep in sync with samples in the
// seed templates' variables list.
const SAMPLE: Record<string, string> = {
  firstName: "Sarah",
  lastName: "Johnson",
  address1: "1247 Ocean Ave",
  city: "St. Petersburg",
  state: "FL",
  zip5: "33716",
  parcelApn: "12-34-56-7890",
  acreage: "4.2",
  offerLow: "8,500",
  offerHigh: "12,000",
  offer: "$50 off your first service",
  senderName: "BH Land Group",
  senderPhone: "(727) 572-9999",
  companyName: "C&D Printing",
};

function merge(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE[k] ?? `{{${k}}}`);
}

export function TemplatePreview({ frontImageUrl, html, aspect }: Props) {
  const aspectClass = aspect === "letter" ? "aspect-[8.5/11]" : "aspect-[9/6]";
  if (frontImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <div className={`${aspectClass} w-full overflow-hidden bg-paper-soft`}>
        <img src={frontImageUrl} alt="Template preview" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${aspectClass} w-full overflow-hidden bg-paper-soft`}>
      <div
        className="h-full w-full"
        // Sample-data merge is rendered as static HTML; safe since templates
        // come from our own admin and SAMPLE is hard-coded.
        dangerouslySetInnerHTML={{ __html: merge(html) }}
      />
    </div>
  );
}
