"use client";

import { useState } from "react";
import Link from "next/link";
import type { Industry } from "@/lib/industries";
import { IndustriesDropdown } from "./industries-dropdown";

interface TierRow {
  minQty: number;
  prices: Record<string, number>;
}

interface PricingProps {
  tiers: TierRow[];
  sizes: string[];
  postage: number;
  effective: string;
}

export function IndustryPage({
  industry,
  pricing,
}: {
  industry: Industry;
  pricing: PricingProps;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <Header />
      <Hero industry={industry} />
      <Pain industry={industry} />
      <WhyBuiltFor industry={industry} />
      <UseCases industry={industry} />
      <RateCardPreview pricing={pricing} industry={industry} />
      <GetStarted industry={industry} />
      <PublicFooter />
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
        <div className="flex items-center gap-1">
          <div className="hidden md:block">
            <IndustriesDropdown />
          </div>
          <Link
            href="/case-studies"
            className="hidden md:inline-flex items-center px-4 h-10 rounded text-ink text-sm font-medium hover:bg-paper-soft transition-colors"
          >
            Case studies
          </Link>
          <a
            href="#get-started"
            className="hidden sm:inline-flex items-center px-4 h-10 rounded bg-ink text-paper text-sm font-medium hover:bg-ink-soft transition-colors ml-2"
          >
            Request a quote
          </a>
          <Link
            href="/login"
            className="inline-flex items-center px-4 h-10 rounded border border-line bg-white text-ink text-sm font-medium hover:bg-paper-soft transition-colors ml-1"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function renderHeadline(headline: string, italicWord: string) {
  const parts = headline.split("{italic}");
  return (
    <>
      {parts[0]}
      <span className="italic text-brand-600">{italicWord}</span>
      {parts[1] ?? ""}
    </>
  );
}

function Hero({ industry }: { industry: Industry }) {
  return (
    <section className="border-b border-line">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-brand-600 mb-4">
          {industry.nav}
        </div>
        <h1 className="font-display text-4xl lg:text-6xl font-medium leading-[1.05] tracking-tight max-w-4xl">
          {renderHeadline(industry.hero.headline, industry.hero.italicWord)}
        </h1>
        <p className="text-lg text-ink-soft mt-6 max-w-2xl leading-relaxed">
          {industry.subhead}
        </p>
        <div className="flex items-center gap-3 mt-8">
          <a
            href="#get-started"
            className="inline-flex items-center px-6 h-12 rounded bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Request a quote →
          </a>
          <Link
            href="/"
            className="inline-flex items-center px-6 h-12 rounded border border-line bg-white text-ink text-sm font-medium hover:bg-paper-soft transition-colors"
          >
            Back to overview
          </Link>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 pt-8 border-t border-line">
          {industry.stats.map((s) => (
            <div key={s.label}>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-stone mb-1">
                {s.label}
              </div>
              <div className="font-display text-2xl font-medium">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pain({ industry }: { industry: Industry }) {
  return (
    <section className="border-b border-line bg-paper-soft">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone mb-4">
          The gap most platforms leave
        </div>
        <p className="font-display text-2xl lg:text-3xl font-medium leading-snug max-w-3xl">
          {industry.pain}
        </p>
      </div>
    </section>
  );
}

function WhyBuiltFor({ industry }: { industry: Industry }) {
  return (
    <section className="border-b border-line">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone mb-4">
          Why MailerCity for {industry.nav.toLowerCase()}
        </div>
        <h2 className="font-display text-3xl lg:text-4xl font-medium max-w-2xl leading-tight mb-12">
          <span className="italic text-brand-600">Built</span> for the way you
          actually mail.
        </h2>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-12">
          {industry.why.map((w) => (
            <div key={w.title}>
              <div className="text-3xl mb-3">{w.icon}</div>
              <h3 className="font-display text-xl font-medium mb-2">{w.title}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases({ industry }: { industry: Industry }) {
  return (
    <section className="border-b border-line bg-paper-soft">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone mb-4">
          Common mailings we run
        </div>
        <h2 className="font-display text-3xl lg:text-4xl font-medium mb-12 max-w-2xl leading-tight">
          What people in {industry.nav.toLowerCase()} actually <span className="italic text-brand-600">mail</span>.
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {industry.useCases.map((u) => (
            <div key={u.title} className="rounded-lg border border-line bg-white p-6">
              <h3 className="font-display text-lg font-medium mb-2">{u.title}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RateCardPreview({
  pricing,
  industry,
}: {
  pricing: PricingProps;
  industry: Industry;
}) {
  return (
    <section className="border-b border-line">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-brand-600 mb-4">
          <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded">
            Pre-Summer Sale
          </span>
          <span className="text-stone">Ends May 31, 2026</span>
        </div>
        <h2 className="font-display text-3xl lg:text-4xl font-medium mb-2 max-w-2xl leading-tight">
          Standard pricing for {industry.pricing}.
        </h2>
        <p className="text-ink-soft mb-8 max-w-2xl">
          Per-piece printing. Standard Class postage{" "}
          <strong>${pricing.postage.toFixed(2)}/piece</strong> on top. Locked
          through <strong>May 31, 2026</strong>.
        </p>

        <div className="rounded-lg border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-mono uppercase tracking-wider text-stone">
                  Qty
                </th>
                {pricing.sizes.map((s) => (
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
              {pricing.tiers.map((tier) => (
                <tr key={tier.minQty} className="border-b border-line last:border-0">
                  <td className="px-6 py-4 font-display text-lg font-medium">
                    {tier.minQty.toLocaleString()}
                  </td>
                  {pricing.sizes.map((s) => (
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
          automation discounts · 7-day standard production turn. Larger volumes
          and First-Class postage quoted on request.
        </p>
      </div>
    </section>
  );
}

function GetStarted({ industry }: { industry: Industry }) {
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
          industry: industry.nav,
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
              Request a quote
            </div>
            <h2 className="font-display text-3xl lg:text-4xl font-medium mb-6 leading-tight">
              Tell us about your <span className="italic text-brand-600">mailing</span>.
            </h2>
            <p className="text-ink-soft leading-relaxed mb-6">
              We&apos;ll respond within one business day with a quote and a
              dashboard login so you can run your first mailing.
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
                  a quote and a path to running your first mailing.
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
                    defaultValue={industry.prefillBody}
                    className="w-full min-h-[100px] rounded border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
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
                  {busy ? "Sending…" : `${industry.ctaLabel} →`}
                </button>
                <p className="text-[11px] text-stone text-center">
                  We&apos;ll respond within one business day. Your info goes
                  straight to our sales team.
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
                  Request a quote
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
            © {new Date().getFullYear()}{" "}C&amp;D Printing &amp; Packaging Co. ·
            Printing Excellence Since 1973.
          </div>
          <div className="font-mono">G7 Master Qualified · FSC Certified</div>
        </div>
      </div>
    </footer>
  );
}
