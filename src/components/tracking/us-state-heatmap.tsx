"use client";

/**
 * Delivery heat map — Leaflet-based.
 *
 * Three base layers (Heat Map / Streets / Satellite) plus a toggleable state
 * choropleth overlay and one CircleMarker per ZIP with mail. Leaflet handles
 * zoom + pan natively (smooth, no page-scroll bleed), which is why we use it
 * over the previous custom SVG implementation.
 *
 * Tile providers (free, attribution included): CartoDB Positron, OpenStreetMap,
 * Esri World Imagery. These ARE external requests — the trade-off for satellite.
 */

import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, TileLayer, LayersControl, GeoJSON, CircleMarker, Tooltip } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import usStatesTopo from "us-atlas/states-10m.json";
import { STATE_NAME_TO_ABBR } from "@/lib/zip-geo";

export interface StateDatum {
  state: string;
  total: number;
  delivered: number;
}
export interface ZipDatum {
  zip: string;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  total: number;
  delivered: number;
}

interface Props {
  data: StateDatum[];
  zips?: ZipDatum[];
}

function rateColor(rate: number): string {
  if (rate >= 0.9) return "#059669";
  if (rate >= 0.5) return "#d97706";
  return "#dc2626";
}

export function UsStateHeatmap({ data, zips = [] }: Props) {
  const byState = useMemo(() => {
    const m = new Map<string, StateDatum>();
    for (const d of data) m.set(d.state, d);
    return m;
  }, [data]);

  const totalPieces = useMemo(() => data.reduce((s, d) => s + d.total, 0), [data]);
  const maxZip = useMemo(() => Math.max(1, ...zips.map((z) => z.total)), [zips]);

  // Convert us-atlas TopoJSON to GeoJSON once.
  const statesGeo = useMemo(() => {
    return feature(
      usStatesTopo as unknown as Parameters<typeof feature>[0],
      (usStatesTopo as unknown as { objects: { states: unknown } }).objects.states as never,
    ) as unknown as FeatureCollection<Geometry, { name: string }>;
  }, []);

  function styleState(f?: Feature<Geometry, { name: string }>): PathOptions {
    if (!f) return {};
    const abbr = STATE_NAME_TO_ABBR[f.properties?.name ?? ""];
    const d = abbr ? byState.get(abbr) : undefined;
    const rate = d && d.total ? d.delivered / d.total : 0;
    const fillColor = d ? rateColor(rate) : "#e7edf3";
    const fillOpacity = d
      ? Math.max(0.3, Math.min(0.7, 0.3 + (d.total / (totalPieces || 1)) * 3))
      : 0.35;
    return { fillColor, fillOpacity, color: "#ffffff", weight: 1 };
  }

  function onEachState(f: Feature<Geometry, { name: string }>, layer: Layer) {
    const abbr = STATE_NAME_TO_ABBR[f.properties?.name ?? ""];
    const d = abbr ? byState.get(abbr) : undefined;
    const label = d
      ? `<strong>${f.properties?.name}</strong><br/>${d.total.toLocaleString()} pieces · ${Math.round((d.delivered / d.total) * 100)}% delivered`
      : `<strong>${f.properties?.name}</strong><br/>No pieces`;
    layer.bindTooltip(label, { sticky: true, direction: "auto" });
  }

  return (
    <div className="space-y-2">
      <MapContainer
        center={[39.5, -98]}
        zoom={4}
        minZoom={3}
        maxZoom={16}
        scrollWheelZoom
        style={{ height: 460, width: "100%", maxWidth: "85%", marginInline: "auto", borderRadius: 8 }}
        worldCopyJump
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Heat Map">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Streets">
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              maxZoom={19}
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="State delivery rates">
            <GeoJSON data={statesGeo} style={styleState as never} onEachFeature={onEachState} />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="ZIP pins">
            <ZipPinLayer zips={zips} maxZip={maxZip} />
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>

      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        <span>Scroll to zoom · drag to pan · top-right toggle = Heat / Streets / Satellite</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#059669" }} /> ≥90%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#d97706" }} /> 50–90%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#dc2626" }} /> &lt;50%
          </span>
        </span>
      </div>
    </div>
  );
}

function ZipPinLayer({ zips, maxZip }: { zips: ZipDatum[]; maxZip: number }) {
  return (
    <>
      {zips.map((z) => {
        const rate = z.total ? z.delivered / z.total : 0;
        const color = rateColor(rate);
        const r = 3 + (z.total / maxZip) * 10;
        return (
          <CircleMarker
            key={z.zip}
            center={[z.lat, z.lng]}
            radius={r}
            pathOptions={{ color: "#ffffff", weight: 0.6, fillColor: color, fillOpacity: 0.85 }}
          >
            <Tooltip direction="top" offset={[0, -2]}>
              <div className="text-xs">
                <div className="font-semibold">
                  {z.zip}
                  {z.city ? ` · ${z.city}, ${z.state}` : ""}
                </div>
                <div>
                  {z.total.toLocaleString()} pieces · {Math.round(rate * 100)}% delivered
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
