/**
 * Intelligent Mail barcode (IMb) utilities.
 *
 * IMb format (USPS DMM 708): 65-bit binary encoded as 65 bars of 4 types
 * (tracker, ascender, descender, full). Human-readable form is 31 digits:
 *
 *   BC (2)  STID (3)  MID (6 or 9)  Serial (9 or 6)  Routing (0/5/9/11)
 *
 * - BC = Barcode Identifier (first digit 0-4, second digit 0-4)
 * - STID = Service Type Identifier (e.g. 300 = First-Class, 700 = Std/Marketing)
 * - MID = Mailer ID from USPS (6 digit for high-volume, 9 digit default)
 * - Serial = unique per mailpiece within MID (reuse allowed after 45 days)
 * - Routing = 0, 5, 9, or 11 digit ZIP/ZIP+4/DPBC
 */

export interface ParsedIMb {
  barcodeId: string;
  serviceType: string;
  mailerId: string;
  serial: string;
  routingZip: string;
  mailerIdLength: 6 | 9;
}

/** Parse a 31-digit IMb into its components. Returns null if invalid. */
export function parseIMb(imb: string): ParsedIMb | null {
  const digits = imb.replace(/\D/g, "");
  // 31 = full IMb with 11-digit routing; some systems strip routing (20/25/29 digits are also legal)
  if (![20, 25, 29, 31].includes(digits.length)) return null;

  const barcodeId = digits.slice(0, 2);
  const serviceType = digits.slice(2, 5);

  // MID length: 9 if first digit of MID is 9, else 6 (USPS rule)
  const midFirst = digits.charAt(5);
  const mailerIdLength: 6 | 9 = midFirst === "9" ? 9 : 6;
  const mailerId = digits.slice(5, 5 + mailerIdLength);
  const serialLength = mailerIdLength === 6 ? 9 : 6;
  const serial = digits.slice(5 + mailerIdLength, 5 + mailerIdLength + serialLength);
  const routingZip = digits.slice(5 + mailerIdLength + serialLength);

  return { barcodeId, serviceType, mailerId, serial, routingZip, mailerIdLength };
}

/**
 * Strict version of parseIMb that also enforces USPS structural rules:
 *   - Each digit of the Barcode ID must be 0-4 (DMM 708 §708.4.3.4)
 *   - Service Type Identifier must look plausible (not all zeros, etc.)
 *   - Routing zip, when present, must be 5/9/11 digits (already enforced by length)
 * This catches off-by-one slice errors in fixed-width parsers, which produce
 * structurally-shaped strings that aren't real USPS barcodes.
 */
export function parseIMbStrict(imb: string): ParsedIMb | null {
  const parsed = parseIMb(imb);
  if (!parsed) return null;
  // BC digits limited to 0-4 — guarantees we're at the right offset
  if (!/^[0-4][0-4]$/.test(parsed.barcodeId)) return null;
  // STID can't be all zeros
  if (parsed.serviceType === "000") return null;
  return parsed;
}

/**
 * Given a raw IMb-ish string that may have leading/trailing garbage chars
 * from a fixed-width slice that was off-by-one, find the embedded valid IMb.
 *
 * Tries the input as-is first, then progressively trims 1 char from each end
 * up to 2 chars total (covers off-by-1, off-by-2, and asymmetric shifts).
 * Returns the cleaned IMb digits (20/25/29/31 chars) or null if nothing valid.
 *
 * Real-world bug this fixes: parsePBC was slicing 31 chars from the .pbc PBC
 * file but the actual IMb field is 29 chars with 1 filler char on each side.
 * Result was 49,135 stored IMbs with extra leading + trailing digits — which
 * looked structurally valid (31 digits) but had bogus BC values like "83",
 * "91" that violate DMM 708's 0-4-per-digit rule.
 */
export function extractCleanIMb(
  raw: string,
  expectedMid?: string | string[],
): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 20) return null;
  const expectedMids = expectedMid
    ? Array.isArray(expectedMid)
      ? expectedMid
      : [expectedMid]
    : [];

  // Build every viable substring (drop 0-2 chars off each end).
  const candidates: string[] = [];
  for (let lead = 0; lead <= 2; lead++) {
    for (let trail = 0; trail <= 2; trail++) {
      const sliced = digits.slice(lead, digits.length - trail);
      if ([20, 25, 29, 31].includes(sliced.length)) candidates.push(sliced);
    }
  }
  candidates.sort((a, b) => b.length - a.length); // longest first

  // PASS 1 (MID-aware): if we know the expected MID, prefer the candidate
  // whose parsed MID matches it. This resolves the BC=10-vs-BC=00 ambiguity:
  // "100271901052658…" parses structurally fine as BC=10/MID=190105, but the
  // REAL piece is "00271901052658…" (BC=00/MID=901052658). Only the MID match
  // tells them apart. Without this, an extra leading digit silently produces
  // a wrong-MID IMb that USPS scans will never match.
  if (expectedMids.length > 0) {
    for (const c of candidates) {
      const parsed = parseIMbStrict(c);
      if (parsed && expectedMids.includes(parsed.mailerId)) return c;
    }
  }

  // PASS 2 (structural only): fall back to longest structurally-valid IMb.
  for (const c of candidates) {
    if (parseIMbStrict(c)) return c;
  }
  return null;
}

/** Build a 31-digit IMb from components (caller is responsible for zip-pad). */
export function buildIMb(p: {
  barcodeId: string;
  serviceType: string;
  mailerId: string;
  serial: string;
  routingZip?: string;
}): string {
  const { barcodeId, serviceType, mailerId, serial, routingZip = "" } = p;
  if (barcodeId.length !== 2) throw new Error("barcodeId must be 2 digits");
  if (serviceType.length !== 3) throw new Error("serviceType must be 3 digits");
  if (mailerId.length !== 6 && mailerId.length !== 9) throw new Error("mailerId must be 6 or 9 digits");
  const expectedSerial = mailerId.length === 6 ? 9 : 6;
  if (serial.length !== expectedSerial) throw new Error(`serial must be ${expectedSerial} digits for this MID`);
  if (![0, 5, 9, 11].includes(routingZip.length)) throw new Error("routingZip must be 0/5/9/11 digits");
  return `${barcodeId}${serviceType}${mailerId}${serial}${routingZip}`;
}

/**
 * Generate unique IMb serials for a batch of mailpieces.
 * Caller supplies MID + starting serial; we increment.
 */
export function* generateSerials(startSerial: string, count: number): Generator<string> {
  const len = startSerial.length;
  let n = parseInt(startSerial, 10);
  for (let i = 0; i < count; i++) {
    yield String(n + i).padStart(len, "0");
  }
}

/**
 * Map a USPS operation code (from IV-MTR) to our normalized enum.
 *
 * Modern IV-MTR push uses 3-digit codes. Codes seen in production from
 * C&D's feed: 483, 484, 517, 891, 893, 918, 919.
 *
 * Bucket strategy by code range (USPS Mail.dat 23-1 / IV-MTR conventions):
 *   001-099  Origin acceptance
 *   100-299  In-transit / sortation between facilities
 *   300-399  Destination delivery prep
 *   400-499  Bundle sortation (Standard Mail) → in-transit
 *   500-599  Logical / predicted events (USPS estimate, not a physical scan)
 *   800-899  Origin sortation
 *   900-919  Destination sortation / out-for-delivery
 *   920-989  Delivered
 *   990-999  Undeliverable (UAA)
 */
export function mapOperationCode(code: string | undefined | null): string {
  if (!code) return "OTHER";
  const raw = code.toString().trim();

  // Explicit 3-digit codes we've confirmed in production
  const exact: Record<string, string> = {
    "001": "ORIGIN_ACCEPTANCE",
    "002": "ORIGIN_ACCEPTANCE",
    "483": "IN_TRANSIT",            // Bundle sortation begin
    "484": "IN_TRANSIT",            // Bundle sortation end
    "517": "IN_TRANSIT",            // Logical / predicted delivery date
    "891": "ORIGIN_PROCESSED",      // Origin sortation
    "893": "ORIGIN_PROCESSED",      // Origin sortation (most common)
    "918": "DESTINATION_DELIVERY", // At destination delivery unit
    "919": "DELIVERED",            // Stop-the-Clock — final delivery for letters
    "920": "OUT_FOR_DELIVERY",
    "921": "OUT_FOR_DELIVERY",
    "942": "DELIVERED",
    "994": "UNDELIVERABLE",
    "995": "UNDELIVERABLE",
    // Legacy 2-digit (kept for older data)
    "10": "ORIGIN_ACCEPTANCE",
    "21": "DESTINATION_PROCESSED",
    "23": "DESTINATION_PROCESSED",
    "35": "DESTINATION_DELIVERY",
    "42": "OUT_FOR_DELIVERY",
    "51": "DELIVERED",
    "80": "IN_TRANSIT",
    "81": "DELIVERED",
    "89": "IN_TRANSIT",
    "92": "ORIGIN_PROCESSED",
    "99": "UNDELIVERABLE",
  };
  if (exact[raw]) return exact[raw];

  // Fall back to range-based bucketing for codes we haven't catalogued
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return "OTHER";
  if (n >= 990 && n <= 999) return "UNDELIVERABLE";
  if (n >= 920 && n <= 989) return "DELIVERED";
  if (n >= 900 && n <= 919) return "DESTINATION_DELIVERY";
  if (n >= 800 && n <= 899) return "ORIGIN_PROCESSED";
  if (n >= 500 && n <= 599) return "IN_TRANSIT"; // logical events
  if (n >= 400 && n <= 499) return "IN_TRANSIT";
  if (n >= 300 && n <= 399) return "DESTINATION_PROCESSED";
  if (n >= 100 && n <= 299) return "IN_TRANSIT";
  if (n >= 1 && n <= 99) return "ORIGIN_ACCEPTANCE";
  return "OTHER";
}
