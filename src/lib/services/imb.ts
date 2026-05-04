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
export function extractCleanIMb(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 20) return null;

  // Try every viable substring length and offset, prefer the longest valid one.
  // Candidates cover: as-is, drop-1-front, drop-1-back, drop-1-each, drop-2-front,
  // drop-2-back, drop-1-front-2-back, drop-2-front-1-back, drop-2-each.
  const candidates: string[] = [];
  for (let lead = 0; lead <= 2; lead++) {
    for (let trail = 0; trail <= 2; trail++) {
      const sliced = digits.slice(lead, digits.length - trail);
      if ([20, 25, 29, 31].includes(sliced.length)) candidates.push(sliced);
    }
  }
  // Prefer longest valid IMb (more routing data = better matching)
  candidates.sort((a, b) => b.length - a.length);
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

/** Map a USPS operation code (from IV-MTR) to our normalized enum. */
export function mapOperationCode(code: string | undefined | null): string {
  if (!code) return "OTHER";
  const c = code.toString().padStart(2, "0");
  // Abbreviated mapping — extend as we learn the feed's real codes.
  // See USPS Mail.dat / IV-MTR operation code reference.
  const map: Record<string, string> = {
    "10": "ORIGIN_ACCEPTANCE",
    "92": "ORIGIN_PROCESSED",
    "80": "IN_TRANSIT",
    "89": "IN_TRANSIT",
    "21": "DESTINATION_PROCESSED",
    "23": "DESTINATION_PROCESSED",
    "35": "DESTINATION_DELIVERY",
    "42": "OUT_FOR_DELIVERY",
    "51": "DELIVERED",
    "81": "DELIVERED",
    "99": "UNDELIVERABLE",
  };
  return map[c] ?? "OTHER";
}
