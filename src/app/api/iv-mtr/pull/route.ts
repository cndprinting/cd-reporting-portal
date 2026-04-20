/**
 * Scheduled worker that pulls new scans from USPS IV-MTR REST API.
 * Call via Vercel Cron (vercel.json): every 30 min.
 *
 * Requires env:
 *   IV_MTR_API_BASE (default https://iv.usps.com/ivws/api)
 *   IV_MTR_USER_ID (BCG username)
 *   IV_MTR_PASSWORD (BCG password)
 *   IV_MTR_MID (your Mailer ID)
 *   CRON_SECRET (Vercel-generated, sent as Authorization: Bearer)
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestIVFile, type IVScanRecord } from "@/lib/services/iv-mtr-ingest";
import { USPS_MID } from "@/lib/usps-config";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const base = process.env.IV_MTR_API_BASE ?? "https://iv.usps.com/ivws/api";
  const userId = process.env.IV_MTR_USER_ID;
  const password = process.env.IV_MTR_PASSWORD;
  const mid = USPS_MID;
  if (!userId || !password || !mid) {
    return NextResponse.json({ error: "IV-MTR credentials not configured" }, { status: 500 });
  }

  // 1. Auth (IV-MTR uses BCG username/password → session token)
  const loginResp = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, password }),
  });
  if (!loginResp.ok) {
    return NextResponse.json({ error: "IV-MTR login failed" }, { status: 502 });
  }
  const { token } = (await loginResp.json()) as { token: string };

  // 2. Pull scans for the last 60 min window (USPS caps each pull)
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000);
  const url = `${base}/scans?mid=${mid}&start=${start.toISOString()}&end=${now.toISOString()}`;
  const scansResp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!scansResp.ok) {
    return NextResponse.json({ error: "IV-MTR scan pull failed" }, { status: 502 });
  }
  const records = (await scansResp.json()) as IVScanRecord[];

  // 3. Ingest
  const result = await ingestIVFile({
    source: "iv-mtr-pull",
    fileName: `pull-${now.toISOString()}.json`,
    body: records,
  });
  return NextResponse.json(result);
}
