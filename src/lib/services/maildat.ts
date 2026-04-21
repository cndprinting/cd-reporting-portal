/**
 * Mail.dat parser — extracts IMb + recipient info from AccuZIP output.
 *
 * Mail.dat is an IDEAlliance-standard file set (typically packaged as a ZIP)
 * containing fixed-width files that describe a mailing. We only need:
 *
 *   .pdr — Piece Detail Record (one row per mailpiece; contains IMb via
 *          IMb Serial Number + Mailer ID references)
 *   .pbc — Piece Barcode Record (full 31-digit IMb)
 *   .hdr — Header Record (job name + job ID — we use this to map to a Campaign)
 *
 * For simpler AccuZIP exports (single-file CSVs with IMb + address), use
 * the `parseIMbCSV` path below.
 */

import type { IVScanRecord } from "./iv-mtr-ingest";
import { parseIMb } from "./imb";

export interface ParsedMailDatPiece {
  imb: string;
  recipientName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip5?: string;
  zip4?: string;
  jobId?: string;
  jobName?: string;
}

export interface ParsedMailDatJob {
  jobId: string;
  jobName: string;
  dropDate?: string;
  mailClass?: string;
  pieces: ParsedMailDatPiece[];
}

/**
 * Parse a Mail.dat .pbc (Piece Barcode) file — fixed-width, one row per piece.
 * We accept either full Mail.dat file content or already-split rows.
 *
 * Standard .pbc layout (abbreviated):
 *   Job ID              (8 chars)
 *   Piece ID            (22 chars)
 *   IM Barcode          (31 chars — the IMb we want)
 *   Reserve             (filler)
 */
export function parsePBC(content: string): { jobId: string; pieceId: string; imb: string }[] {
  const lines = content.split(/\r?\n/).filter((l) => l.length > 31);
  return lines.map((line) => ({
    jobId: line.slice(0, 8).trim(),
    pieceId: line.slice(8, 30).trim(),
    imb: line.slice(30, 61).replace(/[^0-9]/g, "").trim(),
  }));
}

/**
 * Parse a flexible CSV of IMbs + recipient data (AccuZIP's typical list export).
 * Expected columns (case-insensitive, flexible):
 *   imb | barcode | intelligentmailbarcode
 *   name | recipient | recipientname | fullname
 *   address1 | addr1 | street
 *   address2 | addr2
 *   city
 *   state
 *   zip | zip5 | zipcode
 *   zip4 | plus4
 *   jobid | campaigncode (optional, for campaign mapping)
 */
export function parseIMbCSV(csv: string): ParsedMailDatPiece[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const findCol = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.includes(h));

  const iImb = findCol("imb", "barcode", "intelligentmailbarcode", "imb_barcode");
  const iName = findCol("name", "recipient", "recipientname", "fullname");
  const iAddr1 = findCol("address1", "addr1", "street", "address");
  const iAddr2 = findCol("address2", "addr2");
  const iCity = findCol("city");
  const iState = findCol("state");
  const iZip5 = findCol("zip", "zip5", "zipcode");
  const iZip4 = findCol("zip4", "plus4");
  const iJob = findCol("jobid", "job_id", "campaigncode", "campaign_code");

  if (iImb === -1) throw new Error("CSV missing required IMb column");

  const pieces: ParsedMailDatPiece[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCSVLine(line);
    const imb = (cols[iImb] ?? "").replace(/\D/g, "");
    if (!imb || !parseIMb(imb)) continue;
    pieces.push({
      imb,
      recipientName: iName >= 0 ? cols[iName] : undefined,
      addressLine1: iAddr1 >= 0 ? cols[iAddr1] : undefined,
      addressLine2: iAddr2 >= 0 ? cols[iAddr2] : undefined,
      city: iCity >= 0 ? cols[iCity] : undefined,
      state: iState >= 0 ? cols[iState] : undefined,
      zip5: iZip5 >= 0 ? cols[iZip5] : undefined,
      zip4: iZip4 >= 0 ? cols[iZip4] : undefined,
      jobId: iJob >= 0 ? cols[iJob] : undefined,
    });
  }
  return pieces;
}

/** CSV line splitter that handles quoted fields containing commas. */
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (const c of line) {
    if (c === '"') inQ = !inQ;
    else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ""));
}

/**
 * Given raw JSON (e.g. AccuZIP REST export), normalize to ParsedMailDatPiece[].
 * Accepts either an array of piece objects or { pieces: [...] } wrapper.
 */
export function parseIMbJSON(json: string): ParsedMailDatPiece[] {
  const obj = JSON.parse(json);
  const arr: Record<string, unknown>[] = Array.isArray(obj)
    ? obj
    : Array.isArray(obj.pieces)
      ? obj.pieces
      : Array.isArray(obj.records)
        ? obj.records
        : [];

  return arr
    .map((row) => {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          for (const actualKey of Object.keys(row)) {
            if (actualKey.toLowerCase() === k.toLowerCase()) {
              const v = row[actualKey];
              if (v != null) return String(v);
            }
          }
        }
        return undefined;
      };
      const imb = (get("imb", "barcode", "intelligentmailbarcode") ?? "").replace(/\D/g, "");
      if (!imb || !parseIMb(imb)) return null;
      return {
        imb,
        recipientName: get("name", "recipientname", "fullname"),
        addressLine1: get("address1", "addr1", "street"),
        addressLine2: get("address2", "addr2"),
        city: get("city"),
        state: get("state"),
        zip5: get("zip", "zip5", "zipcode"),
        zip4: get("zip4", "plus4"),
        jobId: get("jobid", "campaigncode"),
      };
    })
    .filter((p): p is ParsedMailDatPiece => p !== null);
}
