/**
 * Industry sub-landing config for MailerCity. Each entry powers a page at
 * /industries/[slug]. Add a new industry by adding an entry below — the
 * dynamic route renders it automatically.
 *
 * Content fields:
 *   slug          → URL path segment
 *   nav           → short label for tile/menu copy
 *   hero          → big headline (use {italic} for terracotta-italic emphasis)
 *   subhead       → supporting sentence under hero
 *   pain          → "the problem we solve" — 1-2 sentence
 *   why           → 4 reasons MailerCity is built for this industry
 *   useCases      → 3-4 concrete example mailings
 *   pricing       → which format on the rate card is most relevant
 *   ctaLabel      → submit button label on form
 *   prefillBody   → pre-fills "What are you mailing?" textarea
 */

export interface Industry {
  slug: string;
  nav: string;
  tagline: string;
  hero: { headline: string; italicWord: string };
  subhead: string;
  pain: string;
  why: Array<{ icon: string; title: string; body: string }>;
  useCases: Array<{ title: string; body: string }>;
  pricing: "letters" | "postcards";
  ctaLabel: string;
  prefillBody: string;
  stats: Array<{ label: string; value: string }>;
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "land-investors",
    nav: "Land Investors",
    tagline:
      "Cash-offer mailers to property owners with APN, acreage, and per-parcel offers.",
    hero: {
      headline: "Direct mail built for {italic}.",
      italicWord: "land buyers",
    },
    subhead:
      "APN-level data on every letter. Custom offer ranges per parcel. QR codes tracked back to your landing page. Built for the way land investors actually mail.",
    pain: "Generic mail tools choke on the variable data land investors need — APN, acreage, county, custom offer ranges per parcel, owner contact merge. Most platforms give you name and address, then quit.",
    why: [
      {
        icon: "🗺",
        title: "Parcel-level variable data",
        body: "APN, acreage, county, state, vacant flag, equity tier — merge any field from your PropStream/DataTree export onto every letter.",
      },
      {
        icon: "💲",
        title: "Per-parcel offer ranges",
        body: "Generate cash-offer low/high amounts per piece from a formula, tier table, or your own spreadsheet column. No more one-size-fits-all offers.",
      },
      {
        icon: "📲",
        title: "QR codes to your funnel",
        body: "Every piece has a tracked QR pointing to your landing page or lead form. See exactly which mailings drove responses.",
      },
      {
        icon: "📬",
        title: "USPS scan tracking per piece",
        body: "Watch each letter move through USPS in real time. Know when offers land in mailboxes so you can time follow-up calls.",
      },
    ],
    useCases: [
      {
        title: "Cash offer letters",
        body: "Letter-format mailers with property-specific offer ranges and a QR/phone CTA. Most common land investor playbook.",
      },
      {
        title: "Skip-trace follow-ups",
        body: "Re-mail owners whose first letter didn't get a response. Variable copy lets you reference the prior outreach.",
      },
      {
        title: "Neighborhood farming",
        body: "Saturation mailings to all parcels in a target zip or county. Combine with equity-tier filters for higher response.",
      },
      {
        title: "Probate / heir outreach",
        body: "Highly targeted mailings to inherited / heir-owned parcels with messaging crafted for that specific situation.",
      },
    ],
    pricing: "letters",
    ctaLabel: "Request a quote for land mailers",
    prefillBody:
      "Land investor mailing — letters to property owners with APN, acreage, county, and offer-range merge fields. Looking for [QTY] pieces, drop [TIMING].",
    stats: [
      { label: "Variable fields", value: "APN, acreage, offers, QR" },
      { label: "Common format", value: "Letter · 1-Sheet" },
      { label: "Rate-card minimum", value: "1,000 pieces" },
    ],
  },
  {
    slug: "real-estate",
    nav: "Real Estate",
    tagline:
      "Listing postcards, neighborhood farming, just-sold mailers, and expired/FSBO outreach.",
    hero: {
      headline: "Direct mail for agents, brokers, and {italic}.",
      italicWord: "real estate teams",
    },
    subhead:
      "Just-sold postcards, neighborhood farming, expired-listing letters — every drop should feel hand-crafted to the recipient's address, not stamped from a list.",
    pain: "Generic postcards get tossed. Recipients can tell when they're getting mail-merge spam vs. a piece that knows their neighborhood, their home value, their situation. The platforms most agents use don't make that easy.",
    why: [
      {
        icon: "🏠",
        title: "ZIP, neighborhood, and address-level targeting",
        body: "Pull your farm list from MLS, public records, or any source. We handle variable data merge per piece.",
      },
      {
        icon: "💰",
        title: "Just-sold + just-listed postcards",
        body: "Variable address, sale price, and photo per piece. Drop a stack of postcards across an entire farm area in a single order.",
      },
      {
        icon: "📞",
        title: "Tracked phone numbers + QR",
        body: "Use a unique trackable number on each campaign. See which mailings actually generated calls.",
      },
      {
        icon: "📈",
        title: "Response by drop, not just by year",
        body: "USPS scan tracking + call tracking means you can compare two farming campaigns side by side and double down on what works.",
      },
    ],
    useCases: [
      {
        title: "Farming postcards",
        body: "Recurring monthly drops to your neighborhood farm. Variable data with home value estimates per address.",
      },
      {
        title: "Just-sold mailers",
        body: "Postcards announcing your latest sale to nearby owners — high-trust trigger for listing conversations.",
      },
      {
        title: "Expired-listing letters",
        body: "Targeted letters to owners whose listing expired recently, with messaging tailored to that situation.",
      },
      {
        title: "FSBO outreach",
        body: "For-sale-by-owner mailings explaining how an agent earns their commission. Multi-touch sequences are the norm.",
      },
    ],
    pricing: "postcards",
    ctaLabel: "Request a real estate quote",
    prefillBody:
      "Real estate mailing — looking for [postcards / letters] to [neighborhood / farm area]. Approximately [QTY] pieces, drop [TIMING].",
    stats: [
      { label: "Common formats", value: "Postcards + letters" },
      { label: "Recurring cadence", value: "Monthly farming" },
      { label: "Production turn", value: "5–7 business days" },
    ],
  },
  {
    slug: "nonprofits",
    nav: "Nonprofits",
    tagline: "Donor appeals, acquisition, and year-end giving campaigns.",
    hero: {
      headline: "Direct mail that respects your {italic}.",
      italicWord: "donors",
    },
    subhead:
      "Annual appeals, year-end giving, acquisition. Direct mail is still the highest-ROI channel for serious fundraising — but only if every piece feels personal.",
    pain: "Donor appeals demand higher craft than commodity mail. The salutation matters, the giving history matters, the timing relative to your email + phone outreach matters. Most cheap mail-shop solutions ignore all of it.",
    why: [
      {
        icon: "✉️",
        title: "Personalized salutation + giving history",
        body: "Merge donor name, prior gift level, last gift date — every letter reads like it was written to that donor.",
      },
      {
        icon: "🎯",
        title: "First-class option for premium feel",
        body: "Slightly higher postage, dramatically better presentation. We'll quote both Standard and First Class so you can compare.",
      },
      {
        icon: "📅",
        title: "Timed to your multi-channel outreach",
        body: "Schedule drops so letters arrive the same week as your email push or phone-a-thon. Coordinated touches lift response.",
      },
      {
        icon: "📊",
        title: "Tracked piece-by-piece",
        body: "Know exactly when each major-donor letter lands. Tell board members 'all 200 major-donor letters delivered last week.'",
      },
    ],
    useCases: [
      {
        title: "Year-end appeals",
        body: "Q4 fundraising letters with variable salutation, prior-gift reference, and ask amount. Highest-return mailing of the year.",
      },
      {
        title: "Monthly donor cultivation",
        body: "Recurring sustainer-program letters with personalized impact stats.",
      },
      {
        title: "Major-gift outreach",
        body: "Small-volume, high-touch letters to $1K+ donors. First-class, premium stock, hand-signed if you want it.",
      },
      {
        title: "Acquisition mailings",
        body: "Cold prospect mailings to similar-cause donor lists. Lower response rates but compounds your house file over years.",
      },
    ],
    pricing: "letters",
    ctaLabel: "Request a nonprofit quote",
    prefillBody:
      "Nonprofit mailing — [annual appeal / year-end / acquisition] to [QTY] donors. Drop date target [TIMING]. First-class or Standard?",
    stats: [
      { label: "Common formats", value: "Letters · 1- and 2-sheet" },
      { label: "Postage options", value: "Standard or First Class" },
      { label: "Production turn", value: "5–7 business days" },
    ],
  },
  {
    slug: "healthcare",
    nav: "Healthcare",
    tagline:
      "Patient family communications, program launches, appointment reminders.",
    hero: {
      headline: "Direct mail for {italic}.",
      italicWord: "patient communications",
    },
    subhead:
      "When your hospital launches a new program or a clinic communicates with patient families, you need proof every letter reached the right address. Auditable delivery is the table stakes.",
    pain: "Healthcare communications carry weight — clinical updates, program launches, family notifications. 'We mailed it' isn't enough when compliance or care continuity is on the line. You need scan-level proof every piece was delivered.",
    why: [
      {
        icon: "🔒",
        title: "PHI-conscious data handling",
        body: "Patient lists handled with appropriate care. Variable patient data merged only into the pieces it belongs on.",
      },
      {
        icon: "📋",
        title: "USPS delivery audit trail",
        body: "Per-piece scan history with timestamps and facility data. Documented proof for compliance + clinical-comms teams.",
      },
      {
        icon: "📅",
        title: "Tightly-scheduled drops",
        body: "Coordinated with your communications calendar — drop dates picked to land within the right window relative to the event being announced.",
      },
      {
        icon: "🏥",
        title: "Multi-facility, multi-region",
        body: "Mail from a single batch to recipients across a hospital network's catchment area, with delivery confirmation per region.",
      },
    ],
    useCases: [
      {
        title: "New-service announcements",
        body: "Letters to patient families about a new program, clinic location, or specialty service launching.",
      },
      {
        title: "Appointment reminders",
        body: "Scheduled batch mailings to patient cohorts who need to schedule annual follow-ups or screenings.",
      },
      {
        title: "Patient family communications",
        body: "Updates to families of patients in a specific program — variable patient data, careful tone, fast turnaround.",
      },
      {
        title: "Provider network mailings",
        body: "Communications from a hospital system to its provider network, partner clinics, or referring physicians.",
      },
    ],
    pricing: "letters",
    ctaLabel: "Request a healthcare quote",
    prefillBody:
      "Healthcare communications — [program announcement / patient outreach / family notification] to [QTY] recipients. Target drop [TIMING].",
    stats: [
      { label: "Delivery accountability", value: "Per-piece audit" },
      { label: "Common formats", value: "Letters · 1- and 2-sheet" },
      { label: "Production turn", value: "5–7 business days" },
    ],
  },
  {
    slug: "financial-services",
    nav: "Financial Services",
    tagline:
      "Bank and credit union member communications, rate changes, compliance notices.",
    hero: {
      headline: "Direct mail for {italic} and credit unions.",
      italicWord: "banks",
    },
    subhead:
      "Regulatory notices, rate change letters, member retention campaigns. When delivery is required by regulation, scan-level proof is non-negotiable.",
    pain: "Financial services mail can't miss. Rate change notices, account-update letters, regulatory required disclosures — every single piece needs to be deliverable and provable. Most mail shops give you a CASS report and call it a day.",
    why: [
      {
        icon: "🛡",
        title: "Compliance-grade delivery proof",
        body: "USPS scan tracking on every piece produces an audit trail you can hand to a regulator or auditor.",
      },
      {
        icon: "🔢",
        title: "Variable account data merge",
        body: "Merge account numbers, member names, balance ranges, rate types — all the data that makes regulatory notices specific and compliant.",
      },
      {
        icon: "📆",
        title: "Drop date precision",
        body: "When notices are required by a specific date, we coordinate induction timing with USPS to hit the window.",
      },
      {
        icon: "✓",
        title: "CASS + NCOA on every list",
        body: "Address verification and change-of-address checks included in every job. Standard for financial mailings.",
      },
    ],
    useCases: [
      {
        title: "Rate change notices",
        body: "Regulatory required notices to account holders when rates change. Variable account data, deadline-driven delivery.",
      },
      {
        title: "Statement letters",
        body: "Monthly or quarterly account statements with variable transaction data merged per recipient.",
      },
      {
        title: "Member retention campaigns",
        body: "Member-marketing letters with personalized loan or savings offers based on existing relationship data.",
      },
      {
        title: "Annual privacy notices",
        body: "Required annual disclosures to all account holders. High volume, deadline-driven, audit-trail required.",
      },
    ],
    pricing: "letters",
    ctaLabel: "Request a financial services quote",
    prefillBody:
      "Financial services mailing — [rate notice / statements / member campaign / disclosures]. Approximately [QTY] pieces, deadline [DATE].",
    stats: [
      { label: "Delivery audit", value: "Per-piece scan trail" },
      { label: "Common formats", value: "Letters · 1- and 2-sheet" },
      { label: "List hygiene", value: "CASS + NCOA included" },
    ],
  },
];

export function getIndustry(slug: string): Industry | null {
  return INDUSTRIES.find((i) => i.slug === slug) ?? null;
}
