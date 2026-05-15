/**
 * MailerCity public case studies page.
 *
 * Anonymized RocketPrint-style — no customer names, just industry,
 * volume, and outcome. Piece volumes use real C&D customer data; outcome
 * metrics are placeholders the sales team should fill in with actual
 * results they've measured.
 */

import Link from "next/link";

export const metadata = {
  title: "Case Studies — MailerCity by C&D Printing",
  description:
    "Real direct mail campaigns C&D Printing has produced. Variable-data, USPS-tracked mailings across financial services, healthcare, nonprofits, real estate, and more.",
};

interface CaseStudy {
  industry: string;
  size: string;
  format: string;
  volume: string;
  cadence: string;
  goal: string;
  outcome: string;
  highlights: string[];
  blurb: string;
}

const CASES: CaseStudy[] = [
  {
    industry: "Regional Lifestyle Magazine",
    size: "Mid-market publisher",
    format: "Postcards · variable-data subscriber acquisition",
    volume: "13,000+ pieces per drop",
    cadence: "Monthly recurring",
    goal: "Subscriber acquisition + renewals across Tampa Bay area",
    outcome: "[XX]% response rate · [XX]K new subscribers over 12 months",
    highlights: [
      "Variable-data merge personalizes by ZIP, household profile",
      "Drop date timed to issue release for top-of-mind awareness",
      "USPS tracking confirms in-home dates for circulation reporting",
    ],
    blurb:
      "When a 13,000-piece drop hits mailboxes the same week the issue arrives at newsstands, you compound the impact. C&D handles print, postage, and delivery tracking so the publisher can focus on editorial.",
  },
  {
    industry: "Regional Utility Provider",
    size: "Multi-state operations",
    format: "Letters · 1- and 2-sheet · customer communications",
    volume: "13,000+ pieces per month",
    cadence: "Recurring multi-batch monthly",
    goal: "Regulatory notices + service announcements to ratepayers",
    outcome: "100% delivery accountability · zero missed compliance windows",
    highlights: [
      "Multi-batch parallel production keeps turnaround under 5 business days",
      "Variable account data + customer-segment messaging on every piece",
      "Piece-level USPS tracking proves regulatory delivery requirements",
    ],
    blurb:
      "Utilities can't afford to miss a single ratepayer notice. C&D's piece-level USPS scan tracking gives this provider auditable proof of delivery on every piece in every batch.",
  },
  {
    industry: "Florida Education Nonprofit",
    size: "Statewide fundraising",
    format: "Letters · personalized donor appeals",
    volume: "800–1,000 pieces per appeal",
    cadence: "Quarterly fundraising drops",
    goal: "Donor retention + year-end giving",
    outcome: "[XX]% open-to-donate rate · $[XXX]K raised per appeal cycle",
    highlights: [
      "First-class postage for premium presentation",
      "Variable salutation + giving history merge on every letter",
      "Drop date tightly coordinated to donor email + phone follow-up",
    ],
    blurb:
      "Smaller donor mailings demand higher craft. C&D prints first-class with hand-feel paper, merges donor history into the body copy, and coordinates drop dates with the nonprofit's email and phone outreach.",
  },
  {
    industry: "Land Investor Network",
    size: "23-member buying group",
    format: "Letters · variable-offer mailers · APN-merged",
    volume: "1,000–5,000 pieces per investor per month",
    cadence: "Continuous list-based campaigns",
    goal: "Cash offers to property owners at scale",
    outcome: "[X]% response · multi-million $ in property acquisitions",
    highlights: [
      "Parcel-level variable data (APN, acreage, county) on every letter",
      "Custom offer ranges generated per parcel from owner's spreadsheet",
      "QR codes tracked back to each investor's landing page",
    ],
    blurb:
      "Land investors mail thousands of letters monthly to property owners. C&D's variable-data merge personalizes APN, acreage, county, and offer ranges on every piece — turning generic mass mail into one-to-one outreach.",
  },
  {
    industry: "Children's Healthcare System",
    size: "Multi-hospital network",
    format: "Letters · patient family communications",
    volume: "2,500+ pieces per program",
    cadence: "Program-launch + recurring updates",
    goal: "Patient family outreach for new services",
    outcome: "Auditable delivery for clinical-program rollouts",
    highlights: [
      "HIPAA-conscious data handling, variable patient data",
      "Drop dates synchronized with hospital communication calendar",
      "Per-piece scan tracking ensures every family received notice",
    ],
    blurb:
      "Healthcare communications require proof every family was reached. C&D's USPS scan tracking provides the documented chain-of-custody clinical and compliance teams need.",
  },
  {
    industry: "Youth Services Nonprofit",
    size: "Regional charity",
    format: "Postcards + letters · multi-touch donor campaign",
    volume: "6,900+ pieces per appeal",
    cadence: "Annual major-gift campaign",
    goal: "Major-donor cultivation + giving Tuesday",
    outcome: "[XX]% donor retention · [XX]% lift vs. prior year",
    highlights: [
      "Multi-format campaign: postcards + envelope letters in sequence",
      "Variable donor levels + ask amounts",
      "Drop sequencing coordinated to maximize impact window",
    ],
    blurb:
      "A 7,000-piece campaign isn't just print volume — it's drop sequencing, multi-format design, and tight delivery timing. C&D ran all three for this nonprofit's biggest annual appeal.",
  },
];

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <Header />

      {/* Hero */}
      <section className="border-b border-line">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone mb-4">
            Customer outcomes · Anonymized for confidentiality
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-medium leading-[1.1] tracking-tight max-w-3xl">
            Real direct mail campaigns,{" "}
            <span className="italic text-brand-600">printed and tracked</span> by C&amp;D.
          </h1>
          <p className="text-lg text-ink-soft mt-6 max-w-2xl leading-relaxed">
            Customer names are withheld out of respect for our clients. The
            industries, volumes, and operational details below reflect actual
            campaigns C&amp;D produces — most on recurring cadences for
            multi-year relationships.
          </p>
        </div>
      </section>

      {/* Case studies grid */}
      <section className="border-b border-line bg-paper-soft">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20 space-y-12">
          {CASES.map((c, i) => (
            <CaseStudyCard key={c.industry} c={c} reverse={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-line">
        <div className="max-w-4xl mx-auto px-6 py-16 lg:py-20 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-medium leading-tight">
            Your campaign could be the next one we run.
          </h2>
          <p className="text-ink-soft mt-4 max-w-xl mx-auto">
            Whether you&apos;re mailing 1,000 letters a month or 50,000, we
            handle print, postage, USPS tracking, and reporting — so you can
            focus on the result.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link
              href="/#get-started"
              className="inline-flex items-center px-6 h-12 rounded bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Request a quote →
            </Link>
            <Link
              href="/#rate-card"
              className="inline-flex items-center px-6 h-12 rounded border border-line bg-white text-ink text-sm font-medium hover:bg-paper-soft transition-colors"
            >
              See rate card
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function CaseStudyCard({ c, reverse }: { c: CaseStudy; reverse: boolean }) {
  return (
    <div
      className={`rounded-lg border border-line bg-white p-8 lg:p-10 grid lg:grid-cols-12 gap-8 ${
        reverse ? "lg:[&>div:first-child]:order-2" : ""
      }`}
    >
      <div className="lg:col-span-7 space-y-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-600">
          {c.industry}
        </div>
        <h3 className="font-display text-2xl lg:text-3xl font-medium leading-tight">
          {c.goal}
        </h3>
        <p className="text-ink-soft leading-relaxed">{c.blurb}</p>
        <ul className="space-y-2 pt-2">
          {c.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 text-sm text-ink-soft">
              <span className="text-emerald-600 shrink-0 mt-0.5">✓</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-5">
        <div className="rounded border border-line bg-paper-soft p-6 space-y-4">
          <Stat label="Company" value={c.size} />
          <Stat label="Format" value={c.format} />
          <Stat label="Volume" value={c.volume} />
          <Stat label="Cadence" value={c.cadence} />
          <div className="pt-3 border-t border-line">
            <div className="text-[10px] font-mono uppercase tracking-wider text-stone mb-1">
              Outcome
            </div>
            <div className="font-display text-base font-medium text-emerald-700">
              {c.outcome}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-stone mb-0.5">
        {label}
      </div>
      <div className="text-sm font-medium text-ink leading-snug">{value}</div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo-icon.svg" alt="" className="h-9 w-9" />
          <div className="leading-tight">
            <div className="font-display text-lg font-medium">
              C&amp;D <span className="italic text-brand-600">MailerCity</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-stone">
              Direct mail, printed and tracked.
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center px-4 h-10 rounded text-ink text-sm font-medium hover:bg-paper-soft transition-colors"
          >
            Home
          </Link>
          <Link
            href="/#get-started"
            className="hidden sm:inline-flex items-center px-4 h-10 rounded bg-ink text-paper text-sm font-medium hover:bg-ink-soft transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center px-4 h-10 rounded border border-line bg-white text-ink text-sm font-medium hover:bg-paper-soft transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="font-display text-lg font-medium mb-2">
              C&amp;D <span className="italic text-brand-300">MailerCity</span>
            </div>
            <p className="text-sm text-paper/70 leading-relaxed">
              Direct mail printed and tracked. A C&amp;D Printing &amp;
              Packaging Co. product.
            </p>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-paper/60 mb-3">
              Product
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#rate-card" className="hover:text-brand-300">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/case-studies" className="hover:text-brand-300">
                  Case studies
                </Link>
              </li>
              <li>
                <Link href="/#get-started" className="hover:text-brand-300">
                  Get started
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand-300">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-paper/60 mb-3">
              C&amp;D Printing
            </div>
            <ul className="space-y-2 text-sm text-paper/80">
              <li>12150 28th St N, St. Petersburg, FL 33716</li>
              <li>727-572-9999</li>
              <li>
                <a
                  href="https://cndprinting.com"
                  className="hover:text-brand-300"
                  target="_blank"
                  rel="noreferrer"
                >
                  cndprinting.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-paper/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-paper/50">
          <div>
            © {new Date().getFullYear()} C&amp;D Printing &amp; Packaging Co. ·
            Printing Excellence Since 1973.
          </div>
          <div className="font-mono">G7 Master Qualified · FSC Certified</div>
        </div>
      </div>
    </footer>
  );
}
