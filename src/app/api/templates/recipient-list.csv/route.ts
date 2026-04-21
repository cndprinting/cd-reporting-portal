/**
 * Downloadable recipient-list CSV template.
 * GET /api/templates/recipient-list.csv
 *
 * Returns a CSV with the exact column headers our parser expects,
 * plus 2 sample rows for reference. Customer downloads, fills in, uploads back.
 */

export const runtime = "nodejs";

const HEADERS = [
  "firstName",
  "lastName",
  "address1",
  "address2",
  "city",
  "state",
  "zip5",
  "zip4",
  "email",
  "phone",
  "offer",
];

const SAMPLES = [
  [
    "Alex",
    "Morgan",
    "125 Silver Beach Ave",
    "",
    "Daytona Beach",
    "FL",
    "32118",
    "",
    "alex@example.com",
    "555-0100",
    "Call 555-0100 for a free cash offer",
  ],
  [
    "Jordan",
    "Parker",
    "2840 S Ridgewood Ave",
    "Apt 3B",
    "Port Orange",
    "FL",
    "32129",
    "4201",
    "",
    "",
    "Call 555-0100 for a free cash offer",
  ],
];

export async function GET() {
  const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [HEADERS.map(escape).join(","), ...SAMPLES.map((row) => row.map(escape).join(","))];
  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cd-recipient-list-template.csv"`,
    },
  });
}
