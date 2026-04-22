"use client";

/**
 * Scan-Event Map — live visualization of where USPS is scanning our mail.
 *
 * Loads scan pins from /api/admin/scan-map (one per facility ZIP, geocoded
 * via the bundled `zipcodes` package) and renders them on a Leaflet map
 * with circle markers sized by scan volume.
 *
 * Filters:
 *   - Campaign (all / specific)
 *   - Operation (all / DELIVERED / IN_TRANSIT / etc.)
 *   - Since (last 24h / 7d / 30d / all)
 */

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Leaflet requires `window`, so bundle it client-only
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false, loading: () => <MapLoading /> },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((m) => m.Tooltip),
  { ssr: false },
);

interface Pin {
  zip: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  count: number;
  operations: Record<string, number>;
}

interface Campaign {
  id: string;
  name: string;
  campaignCode: string;
}

function MapLoading() {
  return (
    <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading map…
    </div>
  );
}

const OPERATIONS = [
  { value: "", label: "All operations" },
  { value: "ORIGIN_ACCEPTANCE", label: "Accepted at origin" },
  { value: "ORIGIN_PROCESSED", label: "Processed at origin" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "DESTINATION_PROCESSED", label: "At destination SCF" },
  { value: "DESTINATION_DELIVERY", label: "At delivery unit" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "UNDELIVERABLE", label: "Undeliverable" },
];

const SINCE_OPTIONS = [
  { value: "", label: "All time" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function ScanMapPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalEvents: number;
    uniqueZips: number;
    geocodedZips: number;
    droppedZips: number;
  }>({ totalEvents: 0, uniqueZips: 0, geocodedZips: 0, droppedZips: 0 });

  const [campaignId, setCampaignId] = useState("");
  const [operation, setOperation] = useState("");
  const [since, setSince] = useState("30");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (campaignId) params.set("campaignId", campaignId);
    if (operation) params.set("operation", operation);
    if (since) params.set("since", since);
    fetch(`/api/admin/scan-map?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setPins(d.pins ?? []);
        setStats({
          totalEvents: d.totalEvents ?? 0,
          uniqueZips: d.uniqueZips ?? 0,
          geocodedZips: d.geocodedZips ?? 0,
          droppedZips: d.droppedZips ?? 0,
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? d ?? []));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, operation, since]);

  const maxCount = useMemo(() => Math.max(1, ...pins.map((p) => p.count)), [pins]);

  const radiusFor = (count: number) => {
    // Square-root scaling so a pin 4× as busy looks 2× as large
    const ratio = Math.sqrt(count / maxCount);
    return 6 + ratio * 22; // 6px min, 28px max
  };

  const colorFor = (pin: Pin) => {
    // Color = dominant operation
    const entries = Object.entries(pin.operations).sort((a, b) => b[1] - a[1]);
    const top = entries[0]?.[0] ?? "OTHER";
    if (top === "DELIVERED") return "#059669"; // emerald
    if (top === "UNDELIVERABLE") return "#e11d48"; // rose
    if (top === "OUT_FOR_DELIVERY") return "#ea580c"; // orange
    if (top.includes("PROCESSED") || top === "IN_TRANSIT") return "#0284c7"; // sky
    if (top === "ORIGIN_ACCEPTANCE") return "#7c3aed"; // violet
    return "#6b7280"; // gray
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <MapIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scan-Event Map</h1>
          <p className="text-sm text-gray-500">
            USPS facility scans geocoded by ZIP · colored by dominant operation
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Campaign</label>
              <select
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">All campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.campaignCode} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Operation</label>
              <select
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
              >
                {OPERATIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Time range</label>
              <select
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
                value={since}
                onChange={(e) => setSince(e.target.value)}
              >
                {SINCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Scan events</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">
              {stats.totalEvents.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Unique ZIPs</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">
              {stats.uniqueZips.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Pins on map</div>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">
              {stats.geocodedZips.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Un-geocoded ZIPs
            </div>
            <div className="text-2xl font-bold text-gray-400 mt-0.5">
              {stats.droppedZips.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm">
            {loading ? "Loading…" : `${pins.length} facilities`}
          </CardTitle>
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
            <Legend color="#059669" label="Delivered" />
            <Legend color="#0284c7" label="In transit / processed" />
            <Legend color="#7c3aed" label="Accepted" />
            <Legend color="#ea580c" label="Out for delivery" />
            <Legend color="#e11d48" label="Undeliverable" />
          </div>
        </CardHeader>
        <CardContent>
          {loading && pins.length === 0 ? (
            <MapLoading />
          ) : (
            <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200">
              <MapContainer
                center={[39.5, -98.35] as [number, number]}
                zoom={4}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {pins.map((p) => (
                  <CircleMarker
                    key={p.zip}
                    center={[p.lat, p.lng] as [number, number]}
                    radius={radiusFor(p.count)}
                    pathOptions={{
                      color: colorFor(p),
                      fillColor: colorFor(p),
                      fillOpacity: 0.55,
                      weight: 1.5,
                    }}
                  >
                    <Tooltip direction="top" opacity={1} permanent={false}>
                      <div className="text-xs">
                        <div className="font-semibold">
                          {p.city}, {p.state} {p.zip}
                        </div>
                        <div className="text-gray-600 mt-0.5">
                          {p.count.toLocaleString()} scans
                        </div>
                        {Object.entries(p.operations)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([op, n]) => (
                            <div key={op} className="text-[10px] text-gray-500">
                              {op}: {n}
                            </div>
                          ))}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaflet's default CSS — injected inline so we don't need a separate stylesheet import */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
