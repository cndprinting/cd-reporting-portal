"use client";

/**
 * Design Preview — proposed Direction 3 ("MailerCity tech brand")
 *
 * Shows what a redesign would look like before we apply it site-wide.
 * Distinct color palette, distinct typography, distinct component idioms —
 * intentionally NOT using the existing /components/ui library so it can
 * stand alone as a moodboard.
 *
 * If approved, the underlying tokens (colors, fonts, shapes) get pushed
 * into Tailwind config + globals.css and the existing components inherit.
 */

import { useState } from "react";

// ---- Inline-scoped design tokens for the preview ----
const TOKENS = {
  bg: "#FAF7F2",           // warm off-white
  bgSubtle: "#F2EDE4",     // slightly warmer
  surface: "#FFFFFF",
  text: "#1A1814",         // warm near-black
  textMuted: "#6B6660",    // warm gray
  border: "#E8E0D2",       // warm subtle
  primary: "#B85C3D",      // deep terracotta
  primarySoft: "#F4DDD2",  // tinted bg
  accent: "#2D5F4F",       // forest green (rare second)
  ink: "#0F0E0C",          // for headlines
};

const fontDisplay = "'Newsreader', Georgia, serif";
const fontBody = "'Inter Tight', system-ui, sans-serif";
const fontMono = "'JetBrains Mono', ui-monospace, monospace";

export default function DesignPreviewPage() {
  const [tab, setTab] = useState<"current" | "proposed">("proposed");

  return (
    <>
      {/* Load preview-only fonts on this page */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />

      <div className="space-y-6">
        {/* Comparison toggle */}
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div>
            <div className="text-sm font-semibold text-amber-900">
              Design preview · Direction 3 (MailerCity tech brand)
            </div>
            <div className="text-xs text-amber-700 mt-0.5">
              Toggle below to compare. Nothing on this page is wired to real data —
              it&rsquo;s a moodboard only. Approve the direction and I&rsquo;ll roll
              it across the app.
            </div>
          </div>
          <div className="flex rounded-md bg-white border border-amber-200 p-0.5 text-xs">
            <button
              onClick={() => setTab("current")}
              className={`px-3 py-1.5 rounded ${
                tab === "current" ? "bg-amber-900 text-white" : "text-amber-900"
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setTab("proposed")}
              className={`px-3 py-1.5 rounded ${
                tab === "proposed" ? "bg-amber-900 text-white" : "text-amber-900"
              }`}
            >
              Proposed
            </button>
          </div>
        </div>

        {tab === "current" ? <CurrentSnippet /> : <ProposedSnippet tokens={TOKENS} fontDisplay={fontDisplay} fontBody={fontBody} fontMono={fontMono} />}
      </div>
    </>
  );
}

// ============================================================================
// CURRENT — what it looks like today (sky blue, Geist, rounded everything)
// ============================================================================
function CurrentSnippet() {
  return (
    <div className="space-y-6 p-6 bg-gray-50 rounded-2xl">
      <div className="text-xs font-mono text-gray-400">/ CURRENT</div>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            C&amp;D
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MailerCity</h1>
            <p className="text-sm text-gray-500">Campaign Performance Dashboard</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: "Pieces", v: "12,847", c: "sky" },
          { l: "Delivered", v: "9,401", c: "emerald" },
          { l: "In Transit", v: "2,116", c: "amber" },
          { l: "Awaiting", v: "1,330", c: "rose" },
        ].map((s) => (
          <div key={s.l} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              {s.l}
            </div>
            <div className={`text-2xl font-bold mt-0.5 text-${s.c}-700`}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* Order card */}
      <div className="bg-gradient-to-br from-sky-50 to-emerald-50 border border-sky-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-mono text-sm font-semibold text-sky-900">
              CD-2026-BHLAND-001
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              BH Land Group · Spring Outreach
            </div>
          </div>
          <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            ✓ Approved
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900">$4,250.00</div>
      </div>
    </div>
  );
}

// ============================================================================
// PROPOSED — Direction 3 (MailerCity tech brand)
// ============================================================================
function ProposedSnippet({
  tokens,
  fontDisplay,
  fontBody,
  fontMono,
}: {
  tokens: typeof TOKENS;
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
}) {
  const T = tokens;
  return (
    <div
      className="space-y-8 p-8 rounded-sm"
      style={{
        backgroundColor: T.bg,
        color: T.text,
        fontFamily: fontBody,
      }}
    >
      <div
        className="text-[10px] font-mono uppercase tracking-[0.2em]"
        style={{ color: T.textMuted, fontFamily: fontMono }}
      >
        / PROPOSED · MAILERCITY
      </div>

      {/* Wordmark Header */}
      <div className="flex items-end justify-between border-b pb-6" style={{ borderColor: T.border }}>
        <div>
          <div className="flex items-center gap-3 mb-3">
            {/* Stylized MC monogram in terracotta */}
            <div
              className="h-12 w-12 flex items-center justify-center rounded-sm"
              style={{
                backgroundColor: T.ink,
                color: T.bg,
                fontFamily: fontDisplay,
                fontSize: "26px",
                fontStyle: "italic",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              M
            </div>
            <div>
              <h1
                className="leading-none"
                style={{
                  fontFamily: fontDisplay,
                  fontSize: "44px",
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: T.ink,
                }}
              >
                MailerCity
              </h1>
              <div
                className="text-xs uppercase tracking-[0.18em] mt-1"
                style={{ color: T.textMuted, fontFamily: fontMono }}
              >
                Direct mail · by C&amp;D Printing
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ color: T.textMuted, fontFamily: fontMono }}
          >
            Tuesday · April 30, 2026
          </div>
        </div>
      </div>

      {/* Hero — editorial, not card-grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <div
            className="text-[11px] uppercase tracking-[0.2em] mb-3"
            style={{ color: T.primary, fontFamily: fontMono, fontWeight: 500 }}
          >
            This week
          </div>
          <h2
            style={{
              fontFamily: fontDisplay,
              fontSize: "56px",
              lineHeight: 1.05,
              fontWeight: 400,
              letterSpacing: "-0.025em",
              color: T.ink,
            }}
          >
            <span style={{ fontStyle: "italic", color: T.primary }}>9,401</span>{" "}
            pieces delivered across{" "}
            <span style={{ fontStyle: "italic" }}>3 campaigns</span>.
          </h2>
          <p className="mt-4 text-sm max-w-md" style={{ color: T.textMuted }}>
            BH Land Group&rsquo;s Spring Outreach is at 73% delivery. Achieva
            April 24th drop is in transit. Two campaigns awaiting Tom&rsquo;s
            AccuZIP files.
          </p>
        </div>

        <div className="col-span-5 grid grid-cols-2 gap-4">
          {/* Pieces */}
          <div
            className="p-5 rounded-sm"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: T.textMuted, fontFamily: fontMono }}
            >
              Pieces in flight
            </div>
            <div
              className="mt-1"
              style={{
                fontFamily: fontDisplay,
                fontSize: "36px",
                lineHeight: 1,
                fontWeight: 500,
                color: T.ink,
              }}
            >
              12,847
            </div>
            <div
              className="text-xs mt-2 flex items-center gap-1"
              style={{ color: T.accent }}
            >
              <span style={{ fontFamily: fontMono }}>+18%</span>
              <span style={{ color: T.textMuted }}>vs last week</span>
            </div>
          </div>

          {/* Active customers */}
          <div
            className="p-5 rounded-sm"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: T.textMuted, fontFamily: fontMono }}
            >
              Active customers
            </div>
            <div
              className="mt-1"
              style={{
                fontFamily: fontDisplay,
                fontSize: "36px",
                lineHeight: 1,
                fontWeight: 500,
                color: T.ink,
              }}
            >
              8
            </div>
            <div
              className="text-xs mt-2"
              style={{ color: T.textMuted }}
            >
              <span style={{ fontFamily: fontMono, color: T.accent }}>+1</span>{" "}
              this month
            </div>
          </div>

          {/* Delivered */}
          <div
            className="col-span-2 p-5 rounded-sm"
            style={{ backgroundColor: T.primarySoft, border: `1px solid ${T.primary}30` }}
          >
            <div className="flex items-end justify-between">
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: T.primary, fontFamily: fontMono, fontWeight: 600 }}
                >
                  Delivered this week
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontFamily: fontDisplay,
                    fontSize: "44px",
                    lineHeight: 1,
                    fontWeight: 500,
                    fontStyle: "italic",
                    color: T.ink,
                  }}
                >
                  9,401
                </div>
              </div>
              {/* Sparkline-ish */}
              <svg width="120" height="50" viewBox="0 0 120 50">
                <polyline
                  fill="none"
                  stroke={T.primary}
                  strokeWidth="2"
                  points="0,40 20,32 40,35 60,20 80,18 100,12 120,8"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Order — feels like an invoice / certificate, not a card */}
      <div className="border-t pt-8" style={{ borderColor: T.border }}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.2em] mb-1"
              style={{ color: T.textMuted, fontFamily: fontMono }}
            >
              Order detail
            </div>
            <h3
              style={{
                fontFamily: fontDisplay,
                fontSize: "32px",
                fontWeight: 400,
                color: T.ink,
                letterSpacing: "-0.02em",
              }}
            >
              BH Land Group <span style={{ fontStyle: "italic", color: T.primary }}>—</span> Spring Outreach
            </h3>
            <div
              className="text-sm mt-1"
              style={{ color: T.textMuted, fontFamily: fontMono }}
            >
              CD-2026-BHLAND-001
            </div>
          </div>
          <div
            className="px-3 py-1.5 rounded-sm text-[11px] uppercase tracking-[0.15em]"
            style={{
              backgroundColor: T.accent,
              color: T.bg,
              fontFamily: fontMono,
              fontWeight: 500,
            }}
          >
            Approved &amp; Paid
          </div>
        </div>

        <div
          className="grid grid-cols-4 gap-0 border-t border-b py-6"
          style={{ borderColor: T.border }}
        >
          {[
            { l: "Quantity", v: "5,000" },
            { l: "Per piece", v: "$0.85" },
            { l: "Setup", v: "$0.00" },
            { l: "Total", v: "$4,250.00", emphasis: true },
          ].map((cell, i) => (
            <div
              key={cell.l}
              className={`px-6 ${i > 0 ? "border-l" : ""}`}
              style={{ borderColor: T.border }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.18em] mb-2"
                style={{ color: T.textMuted, fontFamily: fontMono }}
              >
                {cell.l}
              </div>
              <div
                style={{
                  fontFamily: fontDisplay,
                  fontSize: cell.emphasis ? "32px" : "24px",
                  fontWeight: 500,
                  color: T.ink,
                  fontStyle: cell.emphasis ? "italic" : "normal",
                }}
              >
                {cell.v}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            className="px-6 py-3 rounded-sm text-sm font-medium tracking-wide"
            style={{
              backgroundColor: T.ink,
              color: T.bg,
              fontFamily: fontBody,
              fontWeight: 500,
            }}
          >
            View tracking →
          </button>
          <button
            className="px-6 py-3 rounded-sm text-sm font-medium border"
            style={{
              borderColor: T.border,
              color: T.text,
              backgroundColor: T.surface,
              fontFamily: fontBody,
              fontWeight: 500,
            }}
          >
            Download proof
          </button>
          <button
            className="px-6 py-3 rounded-sm text-sm font-medium"
            style={{
              color: T.primary,
              backgroundColor: "transparent",
              fontFamily: fontBody,
              fontWeight: 500,
            }}
          >
            Send to production
          </button>
        </div>
      </div>

      {/* Lifecycle — distinct from the rounded-pills approach */}
      <div className="border-t pt-8" style={{ borderColor: T.border }}>
        <div
          className="text-[10px] uppercase tracking-[0.2em] mb-4"
          style={{ color: T.textMuted, fontFamily: fontMono }}
        >
          Lifecycle
        </div>
        <div className="flex items-center gap-1">
          {[
            { l: "Draft", done: true },
            { l: "In Prep", done: true },
            { l: "Proof", done: true },
            { l: "Approved", done: true, active: true },
            { l: "Dropped", done: false },
            { l: "Delivering", done: false },
            { l: "Complete", done: false },
          ].map((s, i, arr) => (
            <div key={s.l} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-full h-1 rounded-sm"
                  style={{
                    backgroundColor: s.active
                      ? T.primary
                      : s.done
                      ? T.ink
                      : T.border,
                  }}
                />
                <div
                  className="mt-2 text-[10px] uppercase tracking-[0.12em]"
                  style={{
                    color: s.active ? T.primary : s.done ? T.ink : T.textMuted,
                    fontFamily: fontMono,
                    fontWeight: s.active ? 600 : 500,
                  }}
                >
                  {s.l}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div className="w-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Component callouts */}
      <div
        className="border-t pt-8"
        style={{ borderColor: T.border }}
      >
        <div
          className="text-[10px] uppercase tracking-[0.2em] mb-4"
          style={{ color: T.textMuted, fontFamily: fontMono }}
        >
          Design choices
        </div>
        <div className="grid grid-cols-3 gap-6 text-sm" style={{ color: T.text }}>
          <div>
            <div
              style={{ fontFamily: fontDisplay, fontSize: "20px" }}
              className="font-medium mb-1"
            >
              Newsreader serif
            </div>
            <p style={{ color: T.textMuted }} className="text-xs leading-relaxed">
              Display headlines feel editorial. Italic for emphasis instead of color.
              Body stays readable Inter Tight.
            </p>
          </div>
          <div>
            <div
              style={{ fontFamily: fontDisplay, fontSize: "20px", color: T.primary }}
              className="font-medium mb-1"
            >
              Terracotta &amp; ink
            </div>
            <p style={{ color: T.textMuted }} className="text-xs leading-relaxed">
              Single warm accent (#B85C3D) instead of generic blue. Rich
              warm-black ink. Avoids the &ldquo;every-SaaS-app&rdquo; palette.
            </p>
          </div>
          <div>
            <div
              style={{ fontFamily: fontDisplay, fontSize: "20px" }}
              className="font-medium mb-1"
            >
              Architectural shapes
            </div>
            <p style={{ color: T.textMuted }} className="text-xs leading-relaxed">
              2px corners instead of 12px+. Hairline borders. Print-shop grid
              instead of bubble cards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
