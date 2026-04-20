/**
 * Download a sample mail file CSV — 100 rows of valid IMbs under C&D's MID.
 * GET /api/mail-pieces/sample-csv?count=100&campaign=CD-2026-001
 *
 * Use this to test the import flow before real USPS data arrives.
 */

import { NextRequest } from "next/server";
import { buildIMb, generateSerials } from "@/lib/services/imb";
import { USPS_MID } from "@/lib/usps-config";

export const runtime = "nodejs";

const SAMPLE_ADDRESSES = [
  { name: "Alex Morgan", addr: "125 Silver Beach Ave", city: "Daytona Beach", state: "FL", zip5: "32118" },
  { name: "Jordan Parker", addr: "2840 S Ridgewood Ave", city: "Port Orange", state: "FL", zip5: "32129" },
  { name: "Casey Rivera", addr: "18 Ocean Shore Blvd", city: "Ormond Beach", state: "FL", zip5: "32176" },
  { name: "Taylor Kim", addr: "400 Palm Coast Pkwy SW", city: "Palm Coast", state: "FL", zip5: "32137" },
  { name: "Morgan Davis", addr: "520 Flagler Ave", city: "New Smyrna Beach", state: "FL", zip5: "32169" },
  { name: "Riley Thompson", addr: "1800 N Woodland Blvd", city: "DeLand", state: "FL", zip5: "32720" },
  { name: "Skyler Nguyen", addr: "6200 Clyde Morris Blvd", city: "Port Orange", state: "FL", zip5: "32127" },
  { name: "Avery Cooper", addr: "310 Beach St", city: "Daytona Beach", state: "FL", zip5: "32114" },
];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const count = Math.min(parseInt(url.searchParams.get("count") ?? "100", 10), 5000);

  // Build a header + rows
  const headers = [
    "imb",
    "recipientName",
    "addressLine1",
    "city",
    "state",
    "zip5",
    "zip4",
    "expectedInHomeDate",
    "isSeed",
  ];

  const today = new Date();
  const inHome = new Date(today.getTime() + 5 * 86400000).toISOString().slice(0, 10);

  // Start serial at a random-ish number so repeated downloads don't collide
  const startSerial = String(100000 + Math.floor(Math.random() * 800000)).padStart(6, "0");
  const serials = generateSerials(startSerial, count);

  const rows: string[] = [];
  rows.push(headers.join(","));

  let i = 0;
  for (const serial of serials) {
    const addr = SAMPLE_ADDRESSES[i % SAMPLE_ADDRESSES.length];
    const imb = buildIMb({
      barcodeId: "00",
      serviceType: "300", // First-Class IMb Basic
      mailerId: USPS_MID,
      serial,
      // Routing: ZIP+4+2 = 11 digits. Use ZIP5 + 4 zeros + 2 zeros.
      routingZip: `${addr.zip5}000000`,
    });
    const isSeed = i < 3 ? "true" : "false"; // first 3 rows are seed pieces
    rows.push(
      [imb, addr.name, addr.addr, addr.city, addr.state, addr.zip5, "", inHome, isSeed]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    i++;
  }

  const csv = rows.join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cd-sample-mail-file-${Date.now()}.csv"`,
    },
  });
}
