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
