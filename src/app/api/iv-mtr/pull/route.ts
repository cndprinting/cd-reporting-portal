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
  const crid = process.env.IV_MTR_CRID?.trim();
  // IV_MTR_MID may be a single value or comma-separated list.
  const midsEnv = process.env.IV_MTR_MID ?? USPS_MID ?? "";
  const mids = midsEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!userId || !password || (!crid && mids.length === 0)) {
    return NextResponse.json(
      { error: "IV-MTR credentials not configured (need USER_ID, PASSWORD, and CRID or MID)" },
      { status: 500 },
    );
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

  // 2. Pull scans for the last 60 min window (USPS caps each pull).
  //    Prefer CRID (rolls up all MIDs under the company); fall back to looping
  //    over each MID if CRID isn't set.
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000);
  const queries = crid
    ? [`crid=${crid}`]
    : mids.map((m) => `mid=${m}`);

  const allRecords: IVScanRecord[] = [];
  const queryErrors: string[] = [];
  for (const q of queries) {
    const url = `${base}/scans?${q}&start=${start.toISOString()}&end=${now.toISOString()}`;
    const scansResp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!scansResp.ok) {
      queryErrors.push(`${q}: HTTP ${scansResp.status}`);
      continue;
    }
    const batch = (await scansResp.json()) as IVScanRecord[];
    if (Array.isArray(batch)) allRecords.push(...batch);
  }
  if (allRecords.length === 0 && queryErrors.length === queries.length) {
    return NextResponse.json(
      { error: "IV-MTR scan pull failed", details: queryErrors },
      { status: 502 },
    );
  }

  // 3. Ingest
  const result = await ingestIVFile({
    source: "iv-mtr-pull",
    fileName: `pull-${now.toISOString()}.json`,
    body: allRecords,
  });
  return NextResponse.json({ ...result, queries, queryErrors });
}
