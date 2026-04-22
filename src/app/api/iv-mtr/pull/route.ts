/**
 * DEPRECATED — kept as a 410 Gone stub.
 *
 * This endpoint used to poll the legacy USPS IV-MTR REST API at
 * iv.usps.com/ivws/api. USPS retired that platform in January 2026 as part
 * of the Web Tools API retirement + April 2026 API Access Control initiative.
 *
 * We now receive scan data via the IV-MTR "HTTPS JSON" push feed configured
 * at iv.usps.com. USPS POSTs scan events to /api/iv-mtr/ingest every hour,
 * authenticated via HTTP Basic Auth (IV_MTR_PUSH_USER / IV_MTR_INGEST_KEY).
 *
 * Any caller hitting this route — including stale cron jobs, legacy bookmarks,
 * or monitoring probes — should update to reference /api/iv-mtr/ingest.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      error: "deprecated",
      message:
        "This endpoint has been retired. USPS scan data now arrives via push at /api/iv-mtr/ingest. No action required.",
      redirectTo: "/api/iv-mtr/ingest",
    },
    { status: 410 },
  );
}
