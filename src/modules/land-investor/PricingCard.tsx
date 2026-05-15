"use client";

/**
 * Land Investor — Standard Rate Card pricing UI.
 *
 * Renders inside Order Create after the recipient list is uploaded.
 * Customer picks format + size (e.g. "Postcard 6×11" or "Letter 1-Sheet").
 * Price-per-piece is looked up from rate-card.ts based on the row count
 * (auto-tiered) and total displays with print + postage breakdown.
 *
 * The selection (format, size, computed pricePerPiece, totalPrice) is
 * lifted via onChange so the Order Create page can submit it.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Mail, FileText } from "lucide-react";
import {
  FORMAT_OPTIONS,
  lookupRate,
  POSTAGE_PER_UNIT,
  EFFECTIVE_DATE,
  type PieceFormat,
  type PieceSize,
} from "@/lib/services/rate-card";

export interface RateCardSelection {
  format: PieceFormat;
  size: PieceSize;
  pricePerPiece: number; // print + postage combined
  printPerPiece: number;
  postagePerPiece: number;
  totalPrice: number;
  belowMinimum: boolean;
}

interface Props {
  quantity: number;
  /** Initial selection, if any */
  value?: RateCardSelection | null;
  onChange: (selection: RateCardSelection) => void;
}

export function LandInvestorPricingCard({ quantity, value, onChange }: Props) {
  const [format, setFormat] = useState<PieceFormat>(value?.format ?? "letter");
  const [size, setSize] = useState<PieceSize>(value?.size ?? "1-Sheet");

  const filtered = FORMAT_OPTIONS.filter((o) => o.format === format);

  // If switching format invalidates the size, reset to first valid
  useEffect(() => {
    if (!filtered.some((f) => f.size === size)) {
      setSize(filtered[0]?.size ?? "1-Sheet");
    }
  }, [format, filtered, size]);

  const rate = useMemo(
    () => lookupRate({ format, size, quantity }),
    [format, size, quantity],
  );

  // Push selection up whenever it changes
  useEffect(() => {
    onChange({
      format,
      size,
      printPerPiece: rate.printPerPiece,
      postagePerPiece: rate.postagePerPiece,
      pricePerPiece: rate.totalPerPiece,
      totalPrice: rate.orderTotal,
      belowMinimum: rate.belowMinimum,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, size, rate.totalPerPiece, rate.orderTotal, rate.belowMinimum]);

  return (
    <Card className="border-emerald-200">
      <CardHeader className="bg-emerald-50/50 border-b border-emerald-200">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-emerald-700" />
          Pre-Summer Sale pricing
          <Badge variant="success" className="ml-2">
            {EFFECTIVE_DATE}
          </Badge>
        </CardTitle>
        <p className="text-xs text-stone mt-1">
          Auto-tiered by quantity. Includes print + postage. Variable-data
          merge (APN, owner, county) and NCOA list scrub included free.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Format selector — postcard vs letter */}
        <div>
          <div className="text-xs font-semibold text-ink mb-2 uppercase tracking-wider">
            Format
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat("letter")}
              className={`text-left rounded border-2 p-3 transition-colors ${
                format === "letter"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-line bg-white hover:border-stone"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-700" />
                <div className="text-sm font-semibold text-ink">Letter</div>
              </div>
              <div className="text-[11px] text-stone mt-1">
                8.5 × 11 + #10 double-window envelope
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormat("postcard")}
              className={`text-left rounded border-2 p-3 transition-colors ${
                format === "postcard"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-line bg-white hover:border-stone"
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-700" />
                <div className="text-sm font-semibold text-ink">Postcard</div>
              </div>
              <div className="text-[11px] text-stone mt-1">
                Full color front + back
              </div>
            </button>
          </div>
        </div>

        {/* Size selector — depends on format */}
        <div>
          <div className="text-xs font-semibold text-ink mb-2 uppercase tracking-wider">
            Size
          </div>
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((opt) => (
              <button
                key={opt.size}
                type="button"
                onClick={() => setSize(opt.size)}
                className={`text-left rounded border-2 p-3 transition-colors ${
                  size === opt.size
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-line bg-white hover:border-stone"
                }`}
              >
                <div className="text-sm font-semibold text-ink">
                  {opt.label.replace(opt.format === "postcard" ? "Postcard " : "Letter ", "")}
                </div>
                <div className="text-[10px] text-stone mt-0.5 leading-tight">
                  {opt.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Price summary */}
        {rate.belowMinimum ? (
          <div className="rounded bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            Quantity {quantity.toLocaleString()} is below the 1,000-piece
            minimum on the standard rate card. Custom quote required — your
            C&amp;D rep will follow up with pricing.
          </div>
        ) : (
          <div className="rounded-lg bg-paper-soft border border-line p-4">
            <div className="grid grid-cols-3 gap-4 mb-3 pb-3 border-b border-line">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone">
                  Print
                </div>
                <div className="text-lg font-semibold text-ink">
                  ${rate.printPerPiece.toFixed(2)}
                </div>
                <div className="text-[10px] text-stone">per piece</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone">
                  Postage
                </div>
                <div className="text-lg font-semibold text-ink">
                  ${POSTAGE_PER_UNIT.toFixed(2)}
                </div>
                <div className="text-[10px] text-stone">per piece</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone">
                  Total
                </div>
                <div className="text-lg font-semibold text-emerald-700">
                  ${rate.totalPerPiece.toFixed(2)}
                </div>
                <div className="text-[10px] text-stone">per piece</div>
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs text-stone">
                  {quantity.toLocaleString()} pieces × ${rate.totalPerPiece.toFixed(2)}
                </div>
                <div className="text-[11px] text-stone mt-0.5">
                  Tier: {rate.tier.toLocaleString()}+ pieces
                </div>
              </div>
              <div className="text-3xl font-display font-medium text-ink">
                ${rate.orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        <div className="text-[11px] text-stone leading-relaxed">
          Pricing includes free PDF proof + 1 revision round, variable-data
          merge (APN, owner, county, etc.), USPS automation discounts, and
          7-day standard production turn. Final mailable quantity is reconciled
          after AccuZIP CASS/NCOA cleansing — you only pay for pieces that drop.
        </div>
      </CardContent>
    </Card>
  );
}
