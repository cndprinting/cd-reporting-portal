"use client";

/**
 * Land Investor — Order Create UI fields.
 *
 * Renders three sections inside the Order Create flow when a Land/RE customer
 * is logged in:
 *   1. Property column mapping (which uploaded columns are APN / acreage / etc.)
 *   2. Offer pricing rules (per-row, formula, or tiered)
 *   3. Recipient filters (equity, vacant only, acreage range, etc.)
 *
 * Writes a single JSON blob into Order.customFields. The merge engine + the
 * import engine read it back at order-finalization time to compute per-piece
 * offer ranges and write them to MailPiece.customFields.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { landInvestorModule } from "./manifest";
import type { ModuleOrderFieldsProps } from "../registry";
import { Landmark, DollarSign, Filter, Plus, Trash2 } from "lucide-react";

type OfferMode = "per-row" | "formula" | "tiered";

interface Tier {
  min: number;
  max: number;
  low: number;
  high: number;
}

interface LandConfig {
  recipientSource?: string;
  // Map land-investor recipientColumns -> uploaded sheet headers
  columnMap?: Record<string, string>;
  offerRules?: {
    mode: OfferMode;
    perRowLowCol?: string;
    perRowHighCol?: string;
    formula?: { ratePerAcre: number; multiplier: number };
    tiers?: Tier[];
  };
  recipientFilters?: {
    minEquityPct?: number;
    vacantOnly?: boolean;
    heirProbateOnly?: boolean;
    minAcreage?: number;
    maxAcreage?: number;
    skipTraceVerifiedOnly?: boolean;
  };
}

export function LandInvestorOrderFields({
  value,
  onChange,
  rowCount,
  sheetHeaders,
}: ModuleOrderFieldsProps) {
  const cfg = (value as LandConfig) ?? {};
  const offerMode: OfferMode = cfg.offerRules?.mode ?? "formula";
  const filters = cfg.recipientFilters ?? {};
  const columnMap = cfg.columnMap ?? {};

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

  const requiredCols = landInvestorModule.recipientColumns.filter((c) => c.required);
  const optionalCols = landInvestorModule.recipientColumns.filter((c) => !c.required);
  const requiredFilled = requiredCols.every((c) => !!effectiveMap[c.field]);

  const tiers: Tier[] = cfg.offerRules?.tiers ?? [
    { min: 0, max: 5, low: 2000, high: 4000 },
    { min: 5, max: 20, low: 8000, high: 15000 },
    { min: 20, max: 9999, low: 25000, high: 50000 },
  ];

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
          Parcel data, per-piece cash offers, and recipient filters specific to
          land-buying mailers.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        {/* SECTION 1: Property column mapping */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-ink">
                Property data columns
              </div>
              <div className="text-xs text-stone">
                Tell us which columns in your upload are the parcel fields.
                We&rsquo;ll merge these into the letter (APN, acreage, county).
              </div>
            </div>
            <Badge variant={requiredFilled ? "success" : "warning"}>
              {requiredFilled ? "Required mapped ✓" : "Map required fields"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...requiredCols, ...optionalCols].map((col) => (
              <div key={col.field} className="flex items-start gap-2">
                <div className="w-32 shrink-0 pt-2">
                  <div className="text-xs text-ink-soft font-medium">
                    {col.label}
                    {col.required && <span className="text-red-500 ml-0.5">*</span>}
                  </div>
                  {col.hint && (
                    <div className="text-[10px] text-stone leading-tight mt-0.5">
                      {col.hint}
                    </div>
                  )}
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

        {/* SECTION 2: Offer pricing rules */}
        <section className="border-t border-line pt-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-emerald-700" />
            <div>
              <div className="text-sm font-semibold text-ink">
                Cash offer pricing
              </div>
              <div className="text-xs text-stone">
                How should we calculate the offer range printed on each letter?
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {(
              [
                { mode: "formula", label: "Formula", desc: "Acreage × rate" },
                { mode: "tiered", label: "Tiered", desc: "By acreage band" },
                { mode: "per-row", label: "Per-row", desc: "Use list columns" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.mode}
                type="button"
                onClick={() =>
                  update({
                    offerRules: { ...cfg.offerRules, mode: opt.mode },
                  })
                }
                className={`text-left rounded border-2 p-3 transition-colors ${
                  offerMode === opt.mode
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-line bg-white hover:border-stone"
                }`}
              >
                <div className="text-sm font-semibold text-ink">{opt.label}</div>
                <div className="text-[11px] text-stone mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>

          {offerMode === "formula" && (
            <div className="grid grid-cols-2 gap-3 bg-paper-soft rounded p-4 border border-line">
              <div>
                <label className="text-xs text-stone block mb-1">
                  $ per acre (low)
                </label>
                <Input
                  type="number"
                  value={cfg.offerRules?.formula?.ratePerAcre ?? 1000}
                  onChange={(e) =>
                    update({
                      offerRules: {
                        ...cfg.offerRules,
                        mode: "formula",
                        formula: {
                          ratePerAcre: Number(e.target.value),
                          multiplier:
                            cfg.offerRules?.formula?.multiplier ?? 1.4,
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-stone block mb-1">
                  High = low × multiplier
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={cfg.offerRules?.formula?.multiplier ?? 1.4}
                  onChange={(e) =>
                    update({
                      offerRules: {
                        ...cfg.offerRules,
                        mode: "formula",
                        formula: {
                          ratePerAcre:
                            cfg.offerRules?.formula?.ratePerAcre ?? 1000,
                          multiplier: Number(e.target.value),
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="col-span-2 text-xs text-stone bg-white rounded p-2 border border-line">
                Example: 12 acres × $
                {cfg.offerRules?.formula?.ratePerAcre ?? 1000} = $
                {(
                  12 * (cfg.offerRules?.formula?.ratePerAcre ?? 1000)
                ).toLocaleString()}{" "}
                (low) — $
                {(
                  12 *
                  (cfg.offerRules?.formula?.ratePerAcre ?? 1000) *
                  (cfg.offerRules?.formula?.multiplier ?? 1.4)
                ).toLocaleString()}{" "}
                (high)
              </div>
            </div>
          )}

          {offerMode === "tiered" && (
            <div className="bg-paper-soft rounded p-4 border border-line">
              <div className="text-xs text-stone mb-2">
                Each tier sets a flat low/high offer for parcels whose acreage
                falls in the band.
              </div>
              <div className="space-y-2">
                {tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={tier.min}
                        onChange={(e) => {
                          const next = [...tiers];
                          next[i] = { ...tier, min: Number(e.target.value) };
                          update({
                            offerRules: {
                              ...cfg.offerRules,
                              mode: "tiered",
                              tiers: next,
                            },
                          });
                        }}
                        placeholder="Min ac"
                      />
                    </div>
                    <div className="col-span-1 text-center text-stone text-xs">
                      to
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={tier.max}
                        onChange={(e) => {
                          const next = [...tiers];
                          next[i] = { ...tier, max: Number(e.target.value) };
                          update({
                            offerRules: {
                              ...cfg.offerRules,
                              mode: "tiered",
                              tiers: next,
                            },
                          });
                        }}
                        placeholder="Max ac"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        value={tier.low}
                        onChange={(e) => {
                          const next = [...tiers];
                          next[i] = { ...tier, low: Number(e.target.value) };
                          update({
                            offerRules: {
                              ...cfg.offerRules,
                              mode: "tiered",
                              tiers: next,
                            },
                          });
                        }}
                        placeholder="$ low"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        value={tier.high}
                        onChange={(e) => {
                          const next = [...tiers];
                          next[i] = { ...tier, high: Number(e.target.value) };
                          update({
                            offerRules: {
                              ...cfg.offerRules,
                              mode: "tiered",
                              tiers: next,
                            },
                          });
                        }}
                        placeholder="$ high"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = tiers.filter((_, idx) => idx !== i);
                        update({
                          offerRules: {
                            ...cfg.offerRules,
                            mode: "tiered",
                            tiers: next,
                          },
                        });
                      }}
                      className="col-span-1 text-stone hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const last = tiers[tiers.length - 1];
                    const next = [
                      ...tiers,
                      {
                        min: last?.max ?? 0,
                        max: (last?.max ?? 0) + 10,
                        low: 0,
                        high: 0,
                      },
                    ];
                    update({
                      offerRules: {
                        ...cfg.offerRules,
                        mode: "tiered",
                        tiers: next,
                      },
                    });
                  }}
                  className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <Plus className="h-3 w-3" /> Add tier
                </button>
              </div>
            </div>
          )}

          {offerMode === "per-row" && (
            <div className="grid grid-cols-2 gap-3 bg-paper-soft rounded p-4 border border-line">
              <div>
                <label className="text-xs text-stone block mb-1">
                  Column with offer LOW ($)
                </label>
                <select
                  value={cfg.offerRules?.perRowLowCol ?? effectiveMap.offerLow ?? ""}
                  onChange={(e) =>
                    update({
                      offerRules: {
                        ...cfg.offerRules,
                        mode: "per-row",
                        perRowLowCol: e.target.value,
                      },
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
                  value={cfg.offerRules?.perRowHighCol ?? effectiveMap.offerHigh ?? ""}
                  onChange={(e) =>
                    update({
                      offerRules: {
                        ...cfg.offerRules,
                        mode: "per-row",
                        perRowHighCol: e.target.value,
                      },
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
              <div className="col-span-2 text-xs text-stone bg-white rounded p-2 border border-line">
                Use this when you&rsquo;ve already calculated per-parcel offers
                in your spreadsheet (e.g. PropStream export with custom columns).
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: Recipient filters */}
        <section className="border-t border-line pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-emerald-700" />
            <div>
              <div className="text-sm font-semibold text-ink">
                Recipient filters (optional)
              </div>
              <div className="text-xs text-stone">
                Drop pieces from the mailing before merge. Filtered count shows
                up in pricing.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone block mb-1">
                Min equity %
              </label>
              <Input
                type="number"
                placeholder="e.g. 50"
                value={filters.minEquityPct ?? ""}
                onChange={(e) =>
                  update({
                    recipientFilters: {
                      ...filters,
                      minEquityPct: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs text-stone block mb-1">
                Min acreage
              </label>
              <Input
                type="number"
                placeholder="e.g. 1"
                value={filters.minAcreage ?? ""}
                onChange={(e) =>
                  update({
                    recipientFilters: {
                      ...filters,
                      minAcreage: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs text-stone block mb-1">
                Max acreage
              </label>
              <Input
                type="number"
                placeholder="e.g. 200"
                value={filters.maxAcreage ?? ""}
                onChange={(e) =>
                  update({
                    recipientFilters: {
                      ...filters,
                      maxAcreage: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={!!filters.vacantOnly}
                  onChange={(e) =>
                    update({
                      recipientFilters: {
                        ...filters,
                        vacantOnly: e.target.checked,
                      },
                    })
                  }
                />
                Vacant land only (skip improved / SFR)
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={!!filters.heirProbateOnly}
                  onChange={(e) =>
                    update({
                      recipientFilters: {
                        ...filters,
                        heirProbateOnly: e.target.checked,
                      },
                    })
                  }
                />
                Heir / probate parcels only
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={!!filters.skipTraceVerifiedOnly}
                  onChange={(e) =>
                    update({
                      recipientFilters: {
                        ...filters,
                        skipTraceVerifiedOnly: e.target.checked,
                      },
                    })
                  }
                />
                Skip-trace verified addresses only
              </label>
            </div>
          </div>

          {rowCount > 0 && (
            <div className="mt-3 text-xs text-stone">
              Filters apply at submission. Final mailable count after AccuZIP
              cleanse will be reconciled and you&rsquo;ll only pay for pieces
              that actually drop.
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
