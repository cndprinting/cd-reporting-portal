"use client";

/**
 * US state choropleth + ZIP-level pins for mail delivery, with zoom & pan.
 *
 * - Base layer: inline SVG US map (us-atlas TopoJSON), states shaded by
 *   delivery rate. No external map tiles — privacy-safe, no runtime network.
 * - Pin layer: one dot per ZIP that received mail, projected with the same
 *   Albers-USA projection, sized by volume and colored by delivery rate.
 * - Scroll to zoom, drag to pan. Pins shrink with zoom so detail stays legible
 *   when Aaron zooms into a county/metro.
 */

import { useMemo, useRef, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
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

const WIDTH = 760;
const HEIGHT = 460;
const MIN_SCALE = 1;
const MAX_SCALE = 14;

export function UsStateHeatmap({ data, zips = [] }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  // View transform: scale + translate (in SVG user units).
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const byState = useMemo(() => {
    const m = new Map<string, StateDatum>();
    for (const d of data) m.set(d.state, d);
    return m;
  }, [data]);

  const { features, pathFor, projection } = useMemo(() => {
    const fc = feature(
      usStatesTopo as unknown as Parameters<typeof feature>[0],
      (usStatesTopo as unknown as { objects: { states: unknown } }).objects.states as never,
    ) as unknown as FeatureCollection<Geometry, { name: string }>;
    const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], fc);
    return { features: fc.features, pathFor: geoPath(projection), projection };
  }, []);

  const totalPieces = data.reduce((s, d) => s + d.total, 0);
  const maxZip = Math.max(1, ...zips.map((z) => z.total));

  // Project ZIP centroids once.
  const pins = useMemo(() => {
    return zips
      .map((z) => {
        const p = projection([z.lng, z.lat]);
        if (!p) return null;
        return { ...z, px: p[0], py: p[1] };
      })
      .filter((z): z is NonNullable<typeof z> => z !== null);
  }, [zips, projection]);

  // Convert a client point to SVG user coords (pre-transform).
  function toSvg(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = (clientX - rect.left) * (WIDTH / rect.width);
    const sy = (clientY - rect.top) * (HEIGHT / rect.height);
    return { sx, sy };
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const { sx, sy } = toSvg(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    setView((v) => {
      const k = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.k * factor));
      const realFactor = k / v.k;
      // Zoom toward the cursor: keep the point under the cursor fixed.
      const x = sx - (sx - v.x) * realFactor;
      const y = sy - (sy - v.y) * realFactor;
      return k === MIN_SCALE ? { k: 1, x: 0, y: 0 } : { k, x, y };
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (view.k <= 1) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const dx = (e.clientX - drag.current.startX) * (WIDTH / rect.width);
    const dy = (e.clientY - drag.current.startY) * (HEIGHT / rect.height);
    setView((v) => ({ ...v, x: drag.current!.ox + dx, y: drag.current!.oy + dy }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  const zoomed = view.k > 1;
  const pinR = (t: number) => (3 + (t / maxZip) * 9) / Math.sqrt(view.k);

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span>Scroll to zoom · drag to pan · hover a pin for ZIP detail</span>
        {zoomed && (
          <button
            onClick={() => setView({ k: 1, x: 0, y: 0 })}
            className="rounded border border-gray-300 px-2 py-0.5 text-gray-600 hover:bg-gray-50"
          >
            Reset view
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height="auto"
        role="img"
        aria-label="US map of mail delivery by state and ZIP"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ touchAction: "none", cursor: zoomed ? "grab" : "default", background: "#f8fafc", borderRadius: 8 }}
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {features.map((f, i) => {
            const abbr = STATE_NAME_TO_ABBR[f.properties?.name ?? ""];
            const datum = abbr ? byState.get(abbr) : undefined;
            const rate = datum && datum.total ? datum.delivered / datum.total : 0;
            const fill = datum ? rateColor(rate) : "#e7edf3";
            const opacity = datum
              ? Math.max(0.3, Math.min(0.85, 0.3 + (datum.total / (totalPieces || 1)) * 3))
              : 1;
            return (
              <path
                key={i}
                d={pathFor(f) ?? undefined}
                fill={fill}
                fillOpacity={opacity}
                stroke="#ffffff"
                strokeWidth={0.5 / view.k}
                onMouseMove={(e) => {
                  if (drag.current) return;
                  const { sx, sy } = toSvg(e.clientX, e.clientY);
                  const label = datum
                    ? `${f.properties?.name}: ${datum.total.toLocaleString()} pieces · ${Math.round(rate * 100)}% delivered`
                    : `${f.properties?.name}: no pieces`;
                  setHover({ x: sx, y: sy, label });
                }}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}

          {/* ZIP pins */}
          {pins.map((z) => {
            const rate = z.total ? z.delivered / z.total : 0;
            return (
              <circle
                key={z.zip}
                cx={z.px}
                cy={z.py}
                r={pinR(z.total)}
                fill={rateColor(rate)}
                fillOpacity={0.8}
                stroke="#ffffff"
                strokeWidth={0.6 / view.k}
                onMouseMove={(e) => {
                  if (drag.current) return;
                  const { sx, sy } = toSvg(e.clientX, e.clientY);
                  setHover({
                    x: sx,
                    y: sy,
                    label: `${z.zip}${z.city ? ` · ${z.city}, ${z.state}` : ""} — ${z.total.toLocaleString()} pieces · ${Math.round(rate * 100)}% delivered`,
                  });
                }}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
            );
          })}
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{
            left: `${(hover.x / WIDTH) * 100}%`,
            top: `${(hover.y / HEIGHT) * 100}%`,
            transform: "translate(12px, 12px)",
            maxWidth: 260,
          }}
        >
          {hover.label}
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span>Delivery rate:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#059669" }} /> ≥90%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#d97706" }} /> 50–90%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#dc2626" }} /> &lt;50%
        </span>
        <span className="ml-auto text-gray-400">Dot size = ZIP volume</span>
      </div>
    </div>
  );
}
