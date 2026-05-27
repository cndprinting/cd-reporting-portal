/**
 * Map a ZIP code (or an IMb routing code) to a US state.
 *
 * We don't store recipient addresses on every MailPiece, but the IMb routing
 * code embeds the destination ZIP (5/9/11 digits), so we can always derive the
 * delivery state from the barcode. This powers the per-state delivery heat map.
 *
 * Uses standard USPS ZIP3 (first-3-digit) prefix ranges — accurate to the state
 * level for all 50 states + DC + PR.
 */

const ZIP3_RANGES: [number, number, string][] = [
  [0, 5, "CT"], [6, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"],
  [39, 49, "MA"], [50, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"], [100, 149, "NY"],
  [150, 196, "PA"], [197, 199, "DE"], [200, 205, "DC"], [206, 219, "MD"],
  [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"],
  [300, 319, "GA"], [320, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"],
  [386, 397, "MS"], [400, 427, "KY"], [430, 459, "OH"], [460, 479, "IN"],
  [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"],
  [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"],
  [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"],
  [716, 729, "AR"], [730, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"],
  [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"],
  [870, 884, "NM"], [889, 899, "NV"], [900, 961, "CA"], [967, 968, "HI"],
  [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"],
];

/**
 * Derive a 2-letter state code from a ZIP5 or an IMb routing code.
 * Returns null when the input has fewer than 3 usable digits or no match.
 */
export function zipToState(zipOrRouting: string | null | undefined): string | null {
  if (!zipOrRouting) return null;
  const digits = zipOrRouting.replace(/\D/g, "");
  if (digits.length < 3) return null;
  const z3 = parseInt(digits.slice(0, 3), 10);
  if (!Number.isFinite(z3)) return null;
  for (const [a, b, s] of ZIP3_RANGES) {
    if (z3 >= a && z3 <= b) return s;
  }
  return null;
}

/** Full state name -> 2-letter abbreviation (for matching us-atlas geometry). */
export const STATE_NAME_TO_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "Puerto Rico": "PR",
};
