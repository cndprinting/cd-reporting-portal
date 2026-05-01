"use client";

/**
 * Land Investor — Order Create UI fields.
 *
 * Two simple sections (per Aaron's feedback — keep it lean):
 *   1. Property data column mapping — APN, Acreage, County, State
 *   2. Offer type — Single Offer / Offer Range / No Offer Neutral
 *      Each mode tells us which spreadsheet column(s) hold the offers.
 *
 * Writes a single JSON blob into Order.customFields. Merge engine reads it
 * back to write per-piece offer data into MailPiece.customFields at order
 * finalization time.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { landInvestorModule } from "./manifest";
import type { ModuleOrderFieldsProps } from "../registry";
import { Landmark, DollarSign } from "lucide-react";

type OfferType = "single" | "range" | "none";

interface LandConfig {
  recipientSource?: string;
  // Map land-investor recipientColumns -> uploaded sheet headers
  columnMap?: Record<string, string>;
  offerType?: OfferType;
  offerColumns?: {
    single?: string;
    low?: string;
    high?: string;
  };
}

export function LandInvestorOrderFields({
  value,
  onChange,
  sheetHeaders,
}: ModuleOrderFieldsProps) {
  const cfg = (value as LandConfig) ?? {};
  const offerType: OfferType = cfg.offerType ?? "range";
  const columnMap = cfg.columnMap ?? {};
  const offerColumns = cfg.offerColumns ?? {};

  const update = (patch: Partial<LandConfig>) => onChange({ ...cfg, ...patch });

  // Auto-suggest column mappings whenever sheetHeaders change
  const suggestions = useMemo(() => {
    const map: Record<string, string> = {};
    const lcHeaders = sheetHeaders.map((h) => ({ raw: h, lc: h.toLowerCase().trim() }));
    for (const col of landInvestorModule.recipientColumns) {
      const hit = lcHeaders.find((h) =>
        col.aliases.some((a) => h.lc === a.toLowerCase() || h.lc.includes(a.toLowerCase())),
      );
      if (hit) map[col.field] = hit.raw;
    }
    return map;
  }, [sheetHeaders]);

  // Merge suggestions with user overrides — user wins
  const effectiveMap = { ...suggestions, ...columnMap };

  const setColMap = (field: string, header: string) => {
    update({ columnMap: { ...effectiveMap, [field]: header } });
  };

  const requiredFilled = landInvestorModule.recipientColumns.every(
    (c) => !c.required || !!effectiveMap[c.field],
  );

  return (
    <Card className="border-emerald-200">
      <CardHeader className="bg-emerald-50/50 border-b border-emerald-200">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4 text-emerald-700" />
          Land Investor Settings
          <Badge variant="success" className="ml-2">
            BH Land Group module
          </Badge>
        </CardTitle>
        <p className="text-xs text-stone mt-1">
          Tell us which columns are the parcel data, and how to print the offer.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        {/* SECTION 1: Property column mapping (lean — just merge fields) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-ink">
                Property data columns
              </div>
              <div className="text-xs text-stone">
                These get merged into the letter as <code>&lt;&lt;APN&gt;&gt;</code>,{" "}
                <code>&lt;&lt;Acreage&gt;&gt;</code>,{" "}
                <code>&lt;&lt;County&gt;&gt;</code>, and{" "}
                <code>&lt;&lt;State&gt;&gt;</code>.
              </div>
            </div>
            <Badge variant={requiredFilled ? "success" : "warning"}>
              {requiredFilled ? "All mapped ✓" : "Map required fields"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {landInvestorModule.recipientColumns.map((col) => (
              <div key={col.field} className="flex items-center gap-2">
                <div className="w-32 shrink-0">
                  <div className="text-xs text-ink-soft font-medium">
                    {col.label}
                    {col.required && <span className="text-red-500 ml-0.5">*</span>}
                  </div>
                </div>
                <select
                  value={effectiveMap[col.field] ?? ""}
                  onChange={(e) => setColMap(col.field, e.target.value)}
                  className="flex-1 h-9 rounded border border-line bg-white px-2 text-xs"
                  disabled={sheetHeaders.length === 0}
                >
                  <option value="">(not used)</option>
                  {sheetHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-xs text-stone block mb-1">
              Where did this list come from? (optional)
            </label>
            <Input
              placeholder="PropStream, DataTree, manual, etc."
              value={cfg.recipientSource ?? ""}
              onChange={(e) => update({ recipientSource: e.target.value })}
            />
          </div>
        </section>

        {/* SECTION 2: Offer type — Single / Range / None */}
        <section className="border-t border-line pt-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-emerald-700" />
            <div>
              <div className="text-sm font-semibold text-ink">Offer type</div>
              <div className="text-xs text-stone">
                Pick how the cash offer prints on each letter. Whichever you
                choose, your spreadsheet should have the matching offer columns
                ready to map below.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {(
              [
                {
                  type: "single",
                  label: "Single Offer",
                  desc: "One number per parcel",
                },
                {
                  type: "range",
                  label: "Offer Range",
                  desc: "Low & high range",
                },
                {
                  type: "none",
                  label: "No Offer Neutral",
                  desc: "No price printed",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => update({ offerType: opt.type })}
                className={`text-left rounded border-2 p-3 transition-colors ${
                  offerType === opt.type
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-line bg-white hover:border-stone"
                }`}
              >
                <div className="text-sm font-semibold text-ink">{opt.label}</div>
                <div className="text-[11px] text-stone mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>

          {offerType === "single" && (
            <div className="bg-paper-soft rounded p-4 border border-line">
              <label className="text-xs text-stone block mb-1">
                Column with the offer ($)
              </label>
              <select
                value={offerColumns.single ?? ""}
                onChange={(e) =>
                  update({
                    offerColumns: { ...offerColumns, single: e.target.value },
                  })
                }
                className="w-full h-9 rounded border border-line bg-white px-2 text-xs"
              >
                <option value="">(select column)</option>
                {sheetHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-stone mt-2">
                Prints as <code>&lt;&lt;Offer&gt;&gt;</code> on the letter.
              </div>
            </div>
          )}

          {offerType === "range" && (
            <div className="grid grid-cols-2 gap-3 bg-paper-soft rounded p-4 border border-line">
              <div>
                <label className="text-xs text-stone block mb-1">
                  Column with offer LOW ($)
                </label>
                <select
                  value={offerColumns.low ?? ""}
                  onChange={(e) =>
                    update({
                      offerColumns: { ...offerColumns, low: e.target.value },
                    })
                  }
                  className="w-full h-9 rounded border border-line bg-white px-2 text-xs"
                >
                  <option value="">(select column)</option>
                  {sheetHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone block mb-1">
                  Column with offer HIGH ($)
                </label>
                <select
                  value={offerColumns.high ?? ""}
                  onChange={(e) =>
                    update({
                      offerColumns: { ...offerColumns, high: e.target.value },
                    })
                  }
                  className="w-full h-9 rounded border border-line bg-white px-2 text-xs"
                >
                  <option value="">(select column)</option>
                  {sheetHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 text-[11px] text-stone">
                Prints as <code>&lt;&lt;OfferLow&gt;&gt;</code> and{" "}
                <code>&lt;&lt;OfferHigh&gt;&gt;</code> on the letter.
              </div>
            </div>
          )}

          {offerType === "none" && (
            <div className="bg-paper-soft rounded p-4 border border-line text-xs text-stone">
              Neutral mailer — no offer prints. The letter still merges{" "}
              <code>&lt;&lt;APN&gt;&gt;</code>, <code>&lt;&lt;Acreage&gt;&gt;</code>,{" "}
              <code>&lt;&lt;County&gt;&gt;</code>, and{" "}
              <code>&lt;&lt;State&gt;&gt;</code> so the recipient knows it&rsquo;s
              about their parcel.
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
