"use client";

/**
 * Adapter that wraps LandInvestorPricingCard in the ModulePricingCard
 * contract used by the registry. Lives in its own file so manifest.ts
 * can stay JSX-free.
 */

import type { ModulePricingCardProps } from "../registry";
import { LandInvestorPricingCard, type RateCardSelection } from "./PricingCard";

export function LandInvestorPricingCardAdapter({
  quantity,
  value,
  onChange,
}: ModulePricingCardProps) {
  const initial = (value?.details as RateCardSelection | undefined) ?? null;
  return (
    <LandInvestorPricingCard
      quantity={quantity}
      value={initial}
      onChange={(sel) => {
        onChange({
          pricePerPiece: sel.pricePerPiece,
          totalPrice: sel.totalPrice,
          details: sel as unknown as Record<string, unknown>,
        });
      }}
    />
  );
}
