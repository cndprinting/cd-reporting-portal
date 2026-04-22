/**
 * Scan-event map data.
 *
 * GET /api/admin/scan-map?campaignId=...&since=...&operation=...
 *   -> aggregated scan pins, one per ZIP: { zip, lat, lng, city, state, count, operations: {...} }
 *
 * Admin only. Groups ScanEvents by facilityZip, geocodes each zip via the
 * `zipcodes` package (bundled US zip→lat/lng lookup), and returns the
 * result in a map-ready shape. Zips we can't geocode are dropped.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
// @ts-expect-error — zipcodes package has no bundled types
import zipcodes from "zipcodes";

export const runtime = "nodejs";

type ZipLookup = {
  zip: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId") ?? undefined;
  const operation = url.searchParams.get("operation") ?? undefined;
  const since = url.searchParams.get("since"); // ISO date or days-ago number

  // Build filter for ScanEvent
  const where: Record<string, unknown> = {
    facilityZip: { not: null },
  };
  if (campaignId) {
    // Join via MailPiece.campaignId
    where.mailPiece = { campaignId };
  }
  if (operation) where.operation = operation;
  if (since) {
    const d = /^\d+$/.test(since)
      ? new Date(Date.now() - parseInt(since, 10) * 24 * 60 * 60 * 1000)
      : new Date(since);
    if (!isNaN(d.getTime())) where.scanDatetime = { gte: d };
  }

  // Aggregate by facilityZip
  const events = await prisma.scanEvent.findMany({
    where,
    select: {
      facilityZip: true,
      facilityCity: true,
      facilityState: true,
      operation: true,
    },
    take: 50000,
  });

  type Bucket = {
    zip: string;
    count: number;
    operations: Record<string, number>;
    fallbackCity?: string;
    fallbackState?: string;
  };
  const buckets = new Map<string, Bucket>();
  for (const e of events) {
    if (!e.facilityZip) continue;
    const zip = e.facilityZip.slice(0, 5);
    let b = buckets.get(zip);
    if (!b) {
      b = {
        zip,
        count: 0,
        operations: {},
        fallbackCity: e.facilityCity ?? undefined,
        fallbackState: e.facilityState ?? undefined,
      };
      buckets.set(zip, b);
    }
    b.count++;
    b.operations[e.operation] = (b.operations[e.operation] ?? 0) + 1;
  }

  // Geocode each zip via zipcodes package
  const pins: Array<{
    zip: string;
    lat: number;
    lng: number;
    city: string;
    state: string;
    count: number;
    operations: Record<string, number>;
  }> = [];
  let skipped = 0;
  for (const b of buckets.values()) {
    const loc = zipcodes.lookup(b.zip) as ZipLookup | undefined;
    if (!loc || !loc.latitude || !loc.longitude) {
      skipped++;
      continue;
    }
    pins.push({
      zip: b.zip,
      lat: loc.latitude,
      lng: loc.longitude,
      city: loc.city ?? b.fallbackCity ?? "",
      state: loc.state ?? b.fallbackState ?? "",
      count: b.count,
      operations: b.operations,
    });
  }

  pins.sort((a, b) => b.count - a.count);

  return NextResponse.json({
    pins,
    totalEvents: events.length,
    uniqueZips: buckets.size,
    geocodedZips: pins.length,
    droppedZips: skipped,
  });
}
