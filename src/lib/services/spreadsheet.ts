/**
 * Client-side spreadsheet parsing + auto-mapping.
 *
 * Parses CSV / XLSX / TSV into a { headers, rows[] } shape, then runs
 * heuristic column mapping to auto-detect address fields, first name, etc.
 * Used by the Order creation flow to give the customer a live preview of
 * their data without any server round-trip.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

/** Parse a File (from <input type=file>) into headers + rows. */
export async function parseSheet(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseXLSX(file);
  // Default: treat as CSV / TSV
  return parseCSV(file);
}

function parseCSV(file: File): Promise<ParsedSheet> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const rows = (results.data as Record<string, string>[]).filter((r) =>
          Object.values(r).some((v) => v != null && String(v).trim()),
        );
        resolve({ headers, rows, rowCount: rows.length });
      },
      error: (err) => reject(err),
    });
  });
}

async function parseXLSX(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, string>[];
  const headers = json.length > 0 ? Object.keys(json[0]) : [];
  return { headers, rows: json, rowCount: json.length };
}

// -------- Auto column mapping --------

export type StandardField =
  | "firstName"
  | "lastName"
  | "fullName"
  | "address1"
  | "address2"
  | "city"
  | "state"
  | "zip5"
  | "zip4"
  | "email"
  | "phone"
  | "offer"
  | "company";

export interface ColumnMapping {
  [field: string]: string | null; // our-field -> their column header
}

const FIELD_ALIASES: Record<StandardField, RegExp[]> = {
  firstName: [/^first[_\s-]?name$/i, /^fname$/i, /^firstname$/i, /^given/i],
  lastName: [/^last[_\s-]?name$/i, /^lname$/i, /^lastname$/i, /^surname$/i, /^family/i],
  fullName: [/^full[_\s-]?name$/i, /^name$/i, /^customer[_\s-]?name$/i, /^contact/i],
  address1: [
    /^address[_\s-]?1?$/i,
    /^addr[_\s-]?1?$/i,
    /^street[_\s-]?address$/i,
    /^street$/i,
    /^mailing[_\s-]?address$/i,
  ],
  address2: [/^address[_\s-]?2$/i, /^addr[_\s-]?2$/i, /^apt/i, /^suite/i, /^unit/i],
  city: [/^city$/i, /^town$/i, /^municipality$/i],
  state: [/^state$/i, /^province$/i, /^st$/i, /^region$/i],
  zip5: [/^zip$/i, /^zip[_\s-]?5$/i, /^zipcode$/i, /^postal$/i, /^postcode$/i, /^zip[_\s-]?code$/i],
  zip4: [/^zip[_\s-]?4$/i, /^plus[_\s-]?4$/i],
  email: [/^email$/i, /^e[_\s-]?mail$/i, /^email[_\s-]?address$/i],
  phone: [/^phone$/i, /^tel$/i, /^telephone$/i, /^mobile$/i, /^cell$/i],
  offer: [/^offer$/i, /^headline$/i, /^message$/i, /^copy$/i, /^cta$/i],
  company: [/^company$/i, /^org/i, /^business$/i],
};

/** Try to map standard fields to the sheet's column headers automatically. */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const fields = Object.keys(FIELD_ALIASES) as StandardField[];
  for (const field of fields) {
    const patterns = FIELD_ALIASES[field];
    const hit = headers.find((h) => patterns.some((p) => p.test(h.trim())));
    mapping[field] = hit ?? null;
  }
  return mapping;
}

/** Quality score: 0-1. Higher = confident that we can use this list as-is. */
export function mappingQuality(mapping: ColumnMapping): number {
  const required: StandardField[] = ["address1", "city", "state", "zip5"];
  const hasFullOrFirst = mapping.fullName || mapping.firstName || mapping.lastName;
  const reqHits = required.filter((f) => mapping[f]).length;
  return (reqHits + (hasFullOrFirst ? 1 : 0)) / 5;
}

/** Apply a mapping to a row to produce normalized recipient data. */
export function applyMapping(
  row: Record<string, string>,
  mapping: ColumnMapping,
): Record<StandardField, string> {
  const out: Record<string, string> = {};
  for (const [field, column] of Object.entries(mapping)) {
    out[field] = column ? String(row[column] ?? "").trim() : "";
  }
  if (!out.fullName && (out.firstName || out.lastName)) {
    out.fullName = `${out.firstName} ${out.lastName}`.trim();
  }
  if (!out.firstName && out.fullName) {
    out.firstName = out.fullName.split(/\s+/)[0] ?? "";
  }
  return out as Record<StandardField, string>;
}
