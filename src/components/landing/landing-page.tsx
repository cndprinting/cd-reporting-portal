"use client";

/**
 * MailerCity public landing page. Editorial print-shop feel matching the
 * portal's design system (terracotta/paper/Newsreader). Built as one tall
 * scroll with anchor sections.
 */

import { useState } from "react";
import Link from "next/link";

interface TierRow {
  minQty: number;
  prices: Record<string, number>;
}

interface RateCard {
  postcards: TierRow[];
  letters: TierRow[];
  postage: number;
  effective: string;
}

export function LandingPage({ rateCard }: { rateCard: RateCard }) {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <Header />
      <Hero />
      <WhatItIs />
      <FeatureGrid />
      <RateCardSection rateCard={rateCard} />
      <UseCases />
      <GetStarted />
      <Footer />
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
            href="/case-studies"
            className="hidden md:inline-flex items-center px-4 h-10 rounded text-ink text-sm font-medium hover:bg-paper-soft transition-colors"
          >
            Case studies
          </Link>
          <a
            href="#get-started"
            className="hidden sm:inline-flex items-center px-4 h-10 rounded bg-ink text-paper text-sm font-medium hover:bg-ink-soft transition-colors"
          >
            Get started
          </a>
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

function Hero() {
  return (
    <section className="relative border-b border-line">
      <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone">
            Printing Excellence Since 1973
          </div>
          <h1 className="font-display text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight">
            Direct mail, <span className="italic text-brand-600">printed</span> and{" "}
            <span className="italic text-brand-600">tracked</span>.
          </h1>
          <p className="text-lg text-ink-soft leading-relaxed max-w-xl">
            Postcards, letters, and variable-data mailers — printed by C&amp;D and
            tracked piece-by-piece through USPS. No more guessing whether
            your mail landed.
          </p>
          <div className="flex items-center gap-3 pt-4">
            <a
              href="#get-started"
              className="inline-flex items-center px-6 h-12 rounded bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Get started →
            </a>
            <a
              href="#rate-card"
              className="inline-flex items-center px-6 h-12 rounded border border-line bg-white text-ink text-sm font-medium hover:bg-paper-soft transition-colors"
            >
              See pricing
            </a>
          </div>
          <div className="flex items-center gap-6 pt-6 text-xs text-stone">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> USPS IV-MTR tracking
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> Variable data merge
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> 7-day production
            </span>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="relative rounded-lg border border-line bg-white p-6 shadow-sm">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone mb-2">
              Live tracking · MGE Apr 30
            </div>
            <div className="font-display text-2xl font-medium mb-4">
              <span className="italic text-brand-600">1,795</span> of 2,425 delivered
              <span className="text-stone"> · 74% rate.</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-line">
                <span className="text-stone">Origin processed</span>
                <span className="font-medium">2,425 / 2,425</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line">
                <span className="text-stone">In-transit</span>
                <span className="font-medium">2,389 / 2,425</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line">
                <span className="text-stone">At delivery unit</span>
                <span className="font-medium">2,118 / 2,425</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-stone">Delivered</span>
                <span className="font-semibold text-emerald-700">1,795 / 2,425</span>
              </div>
            </div>
            <div className="text-[10px] text-stone mt-3 font-mono">
              Last scan · TAMPA FL · 12 min ago
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatItIs() {
  return (
    <section className="border-b border-line bg-paper-soft">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone mb-4">
          What it is
        </div>
        <h2 className="font-display text-3xl lg:text-4xl font-medium max-w-3xl leading-tight">
          A direct mail platform that <span className="italic text-brand-600">tells you the truth</span> about
          where your mail is.
        </h2>
        <p className="text-ink-soft mt-6 max-w-2xl leading-relaxed">
          We print your postcards or letters at C&amp;D&apos;s plant in St.
          Petersburg, drop them with USPS, and stream every scan back to your
          dashboard. You see when mail leaves origin, hits transit facilities,
          arrives at the local post office, and gets delivered — at the
          individual-piece level, in near real-time.
        </p>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      icon: "📬",
      title: "Piece-level USPS tracking",
      body: "Every mailpiece gets a unique Intelligent Mail barcode. We're plugged into USPS IV-MTR, so you see facility-level scans from origin to delivery on every piece.",
    },
    {
      icon: "✏️",
      title: "Variable data merge",
      body: "First name, address, APN, custom offer amounts — merge any field from your list onto every piece. One design, thousands of personalized letters.",
    },
    {
      icon: "💲",
      title: "Transparent rate card",
      body: "No hidden fees, no \"call for pricing.\" Pick your size and quantity, see the price, place the order. Postage included separately at USPS rates.",
    },
    {
      icon: "🎨",
      title: "Your design or ours",
      body: "Drop in your own print-ready PDF, or pick from our template library. Our prepress team checks every file before press.",
    },
    {
      icon: "📋",
      title: "List cleansing included",
      body: "CASS certification and NCOA on every list. Final mailable count is reconciled after cleansing — you only pay for pieces that actually drop.",
    },
    {
      icon: "🔗",
      title: "QR & call tracking",
      body: "Add a QR code that points to your tracked landing page. Combine with call-tracking numbers to attribute responses to specific mailings.",
    },
  ];

  return (
    <section className="border-b border-line">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone mb-4">
          Built for serious mailers
        </div>
        <h2 className="font-display text-3xl lg:text-4xl font-medium mb-12 max-w-2xl leading-tight">
          Everything you need to <span className="italic text-brand-600">run</span> direct mail,
          not just print it.
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {features.map((f) => (
            <div key={f.title}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display text-xl font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RateCardSection({ rateCard }: { rateCard: RateCard }) {
  const [tab, setTab] = useState<"postcards" | "letters">("letters");
  const tiers = tab === "postcards" ? rateCard.postcards : rateCard.letters;
  const sizes = tab === "postcards" ? ["4.25x6", "6x8.5", "6x11"] : ["1-Sheet", "2-Sheet"];

  return (
    <section id="rate-card" className="border-b border-line bg-paper-soft">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-brand-600 mb-4">
          <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded">
            Pre-Summer Sale
          </span>
          <span className="text-stone">May &amp; June 2026</span>
        </div>
        <h2 className="font-display text-3xl lg:text-4xl font-medium mb-2 max-w-2xl leading-tight">
          <span className="italic text-brand-600">Transparent</span> pricing,
          tiered by volume.
        </h2>
        <p className="text-ink-soft mb-8 max-w-2xl">
          Per-piece printing only. Standard Class postage is{" "}
          <strong>${rateCard.postage.toFixed(2)}/piece</strong> on top.
          Pricing below is locked through <strong>June 30, 2026</strong>.
        </p>

        <div className="inline-flex items-center rounded-lg bg-white border border-line p-1 mb-6">
          <button
            onClick={() => setTab("letters")}
            className={`px-5 h-10 rounded text-sm font-medium transition-colors ${
              tab === "letters" ? "bg-ink text-paper" : "text-ink hover:bg-paper-soft"
            }`}
          >
            Letters
          </button>
          <button
            onClick={() => setTab("postcards")}
            className={`px-5 h-10 rounded text-sm font-medium transition-colors ${
              tab === "postcards" ? "bg-ink text-paper" : "text-ink hover:bg-paper-soft"
            }`}
          >
            Postcards
          </button>
        </div>

        <div className="rounded-lg border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-mono uppercase tracking-wider text-stone">
                  Qty
                </th>
                {sizes.map((s) => (
                  <th
                    key={s}
                    className="text-right px-6 py-4 text-xs font-mono uppercase tracking-wider text-stone"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.minQty} className="border-b border-line last:border-0">
                  <td className="px-6 py-4 font-display text-lg font-medium">
                    {tier.minQty.toLocaleString()}
                  </td>
                  {sizes.map((s) => (
                    <td key={s} className="text-right px-6 py-4 font-mono">
                      ${tier.prices[s]?.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone mt-4">
          Includes free PDF proof + 1 revision · NCOA list cleansing · USPS
          automation discounts · 7-day standard production turn. Postage added
          separately.
        </p>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    {
      tag: "Land investors",
      title: "Variable-offer mailers to property owners",
      body: "Merge APN, acreage, county, and your custom cash-offer range into every letter. Track who responded by piece-level QR codes.",
    },
    {
      tag: "Real estate",
      title: "Neighborhood farming + listing announcements",
      body: "Drop 5,000 postcards into a ZIP code, see exactly when each landed. Tie call-tracking numbers to specific drops.",
    },
    {
      tag: "Nonprofits",
      title: "Donor appeals + event invitations",
      body: "First-class letters with personalized greetings, drop dates timed to event windows, delivery confirmation reporting.",
    },
    {
      tag: "Banks & financial",
      title: "Statements, offers, and compliance mailings",
      body: "Variable account data, regulator-required notices, and full audit trails of when each piece was delivered.",
    },
  ];

  return (
    <section className="border-b border-line">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone mb-4">
          Who's mailing with us
        </div>
        <h2 className="font-display text-3xl lg:text-4xl font-medium mb-12 max-w-2xl leading-tight">
          From <span className="italic text-brand-600">single letters</span> to
          50,000-piece drops.
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {cases.map((c) => (
            <div key={c.tag} className="rounded-lg border border-line bg-white p-6">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-600 mb-2">
                {c.tag}
              </div>
              <h3 className="font-display text-xl font-medium mb-2">{c.title}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GetStarted() {
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const fd = new FormData(f);
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          company: String(fd.get("company") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          message: String(fd.get("message") ?? ""),
          hp: String(fd.get("hp") ?? ""),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error ?? "Something went wrong");
        return;
      }
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="get-started" className="border-b border-line bg-paper-soft">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone mb-4">
              Get started
            </div>
            <h2 className="font-display text-3xl lg:text-4xl font-medium mb-6 leading-tight">
              Tell us about your <span className="italic text-brand-600">mailing</span>.
            </h2>
            <p className="text-ink-soft leading-relaxed mb-6">
              We&apos;ll get back within one business day with a quote, a
              dashboard login, and a path to running your first mailing.
            </p>
            <div className="space-y-3 text-sm text-ink-soft">
              <div className="flex items-start gap-3">
                <span className="text-brand-600 mt-0.5">📞</span>
                <div>
                  <div className="font-medium text-ink">727-572-9999</div>
                  <div className="text-xs text-stone">C&amp;D main line</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-brand-600 mt-0.5">📍</span>
                <div>
                  <div className="font-medium text-ink">12150 28th St N</div>
                  <div className="text-xs text-stone">St. Petersburg, FL 33716</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {submitted ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
                <div className="text-4xl mb-3">✓</div>
                <h3 className="font-display text-2xl font-medium mb-2 text-emerald-900">
                  Got it.
                </h3>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  Thanks — we&apos;ll be in touch within one business day with
                  a quote and a path to getting your first mailing live.
                </p>
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="rounded-lg border border-line bg-white p-8 space-y-4"
              >
                <input
                  type="text"
                  name="hp"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field name="name" label="Name *" required />
                  <Field name="email" label="Email *" type="email" required />
                  <Field name="company" label="Company" />
                  <Field name="phone" label="Phone" type="tel" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-stone block mb-1.5">
                    What are you mailing?
                  </label>
                  <textarea
                    name="message"
                    className="w-full min-h-[100px] rounded border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
                    placeholder="e.g. 5,000 letters to land owners in Florida — looking for monthly cadence."
                  />
                </div>
                {err && (
                  <div className="rounded bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
                    {err}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 rounded bg-ink text-paper font-medium text-sm hover:bg-ink-soft transition-colors disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Request a quote →"}
                </button>
                <p className="text-[11px] text-stone text-center">
                  We&apos;ll respond within one business day. No spam, no list
                  sharing — your info goes straight to our sales team.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-mono uppercase tracking-wider text-stone block mb-1.5">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full h-11 rounded border border-line bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
      />
    </div>
  );
}

function Footer() {
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
                <a href="#rate-card" className="hover:text-brand-300">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/case-studies" className="hover:text-brand-300">
                  Case studies
                </Link>
              </li>
              <li>
                <a href="#get-started" className="hover:text-brand-300">
                  Get started
                </a>
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
