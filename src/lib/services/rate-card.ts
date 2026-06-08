/**
 * C&D MailerCity Direct Rate Card — Standard Pricing (effective May-2026).
 *
 * Used by Land/RE customers (modules: land-investor) as the default per-piece
 * pricing in the Order Create flow. Per-customer overrides go on the Company
 * record later if needed.
 *
 * To update prices:
 *   1. Edit the tables below
 *   2. Bump EFFECTIVE_DATE
 *   3. Commit + push — change goes live on next deploy
 *
 * The card covers PRINTING ONLY. Postage is added separately at POSTAGE_PER_UNIT.
 *
 * Source: CD_Direct_Rate_Card_2026.pdf (May 2026 rev)
 */

// Single source of truth for the active rate-card promotion. Any page that
// references the sale label or end date should import these — do NOT hardcode
// dates in components.
export const RATE_CARD_VERSION = "2026-06-summer";
export const SALE_LABEL = "Summer Sale";                       // badge text
export const SALE_END_SHORT = "ends Aug 31";                    // short suffix
export const SALE_END_LONG = "August 31, 2026";                 // full date
export const EFFECTIVE_DATE = `${SALE_LABEL} · ${SALE_END_SHORT}`;
export const RATE_CARD_EXPIRES = SALE_END_LONG;
export const POSTAGE_PER_UNIT = 0.43; // USPS Marketing/Standard Class

export type PostcardSize = "4.25x6" | "6x8.5" | "6x11";
export type LetterSize = "1-Sheet" | "2-Sheet";
export type PieceFormat = "postcard" | "letter";
export type PieceSize = PostcardSize | LetterSize;

interface TierRow {
  /** Minimum quantity for this tier — order qty >= minQty unlocks this row's prices */
  minQty: number;
  prices: Record<string, number>;
}

/**
 * POSTCARDS — full-color front + back, no postage
 * Columns: 4.25x6, 6x8.5, 6x11
 */
const POSTCARD_TIERS: TierRow[] = [
  { minQty: 1_000, prices: { "4.25x6": 0.16, "6x8.5": 0.21, "6x11": 0.26 } },
  { minQty: 5_000, prices: { "4.25x6": 0.14, "6x8.5": 0.19, "6x11": 0.24 } },
  { minQty: 10_000, prices: { "4.25x6": 0.14, "6x8.5": 0.19, "6x11": 0.24 } },
  { minQty: 15_000, prices: { "4.25x6": 0.14, "6x8.5": 0.19, "6x11": 0.24 } },
  { minQty: 30_000, prices: { "4.25x6": 0.13, "6x8.5": 0.18, "6x11": 0.23 } },
  { minQty: 50_000, prices: { "4.25x6": 0.12, "6x8.5": 0.17, "6x11": 0.22 } },
];

/**
 * LETTERS — 8.5 × 11 color front + #10 double-window envelope, no postage
 * Columns: 1-Sheet, 2-Sheet
 */
const LETTER_TIERS: TierRow[] = [
  { minQty: 1_000, prices: { "1-Sheet": 0.24, "2-Sheet": 0.29 } },
  { minQty: 5_000, prices: { "1-Sheet": 0.22, "2-Sheet": 0.27 } },
  { minQty: 10_000, prices: { "1-Sheet": 0.20, "2-Sheet": 0.25 } },
  { minQty: 15_000, prices: { "1-Sheet": 0.16, "2-Sheet": 0.21 } },
  { minQty: 30_000, prices: { "1-Sheet": 0.14, "2-Sheet": 0.19 } },
  { minQty: 50_000, prices: { "1-Sheet": 0.12, "2-Sheet": 0.17 } },
];

/** Find the applicable tier row: largest minQty <= quantity. */
function findTier(tiers: TierRow[], quantity: number): TierRow | null {
  let match: TierRow | null = null;
  for (const t of tiers) {
    if (quantity >= t.minQty) match = t;
    else break;
  }
  return match;
}

export interface RateLookup {
  format: PieceFormat;
  size: PieceSize;
  quantity: number;
}

export interface RateResult {
  /** Per-piece print cost (no postage) */
  printPerPiece: number;
  /** Per-piece postage */
  postagePerPiece: number;
  /** Per-piece total = print + postage */
  totalPerPiece: number;
  /** Print subtotal = printPerPiece × quantity */
  printSubtotal: number;
  /** Postage subtotal = postagePerPiece × quantity */
  postageSubtotal: number;
  /** Order total = printSubtotal + postageSubtotal */
  orderTotal: number;
  /** Tier minQty that priced this order */
  tier: number;
  /** Quantity below the smallest tier — pricing not available */
  belowMinimum: boolean;
}

/**
 * Look up the per-piece price + order total for a given format/size/quantity.
 * Returns belowMinimum=true if quantity < 1000 (smallest tier on the card).
 */
export function lookupRate(input: RateLookup): RateResult {
  const tiers = input.format === "postcard" ? POSTCARD_TIERS : LETTER_TIERS;
  const tier = findTier(tiers, input.quantity);

  if (!tier) {
    return {
      printPerPiece: 0,
      postagePerPiece: POSTAGE_PER_UNIT,
      totalPerPiece: POSTAGE_PER_UNIT,
      printSubtotal: 0,
      postageSubtotal: input.quantity * POSTAGE_PER_UNIT,
      orderTotal: input.quantity * POSTAGE_PER_UNIT,
      tier: 0,
      belowMinimum: true,
    };
  }

  const printPerPiece = tier.prices[input.size] ?? 0;
  const totalPerPiece = printPerPiece + POSTAGE_PER_UNIT;
  const printSubtotal = printPerPiece * input.quantity;
  const postageSubtotal = POSTAGE_PER_UNIT * input.quantity;

  return {
    printPerPiece,
    postagePerPiece: POSTAGE_PER_UNIT,
    totalPerPiece,
    printSubtotal,
    postageSubtotal,
    orderTotal: printSubtotal + postageSubtotal,
    tier: tier.minQty,
    belowMinimum: false,
  };
}

/** Available format + size options for the order UI to render. */
export const FORMAT_OPTIONS: Array<{
  format: PieceFormat;
  size: PieceSize;
  label: string;
  description: string;
}> = [
  { format: "postcard", size: "4.25x6", label: "Postcard 4.25 × 6", description: "Standard size, lowest postage" },
  { format: "postcard", size: "6x8.5", label: "Postcard 6 × 8.5", description: "Mid-size, more visual real estate" },
  { format: "postcard", size: "6x11", label: "Postcard 6 × 11", description: "Oversized, max impact" },
  { format: "letter", size: "1-Sheet", label: "Letter (1 sheet)", description: "8.5 × 11 + #10 double-window envelope" },
  { format: "letter", size: "2-Sheet", label: "Letter (2 sheets)", description: "8.5 × 11 + #10 double-window envelope" },
];

/** All tiers (for showing the rate card itself in UI) */
export const ALL_TIERS = {
  postcards: POSTCARD_TIERS,
  letters: LETTER_TIERS,
};
