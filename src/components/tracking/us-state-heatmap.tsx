"use client";

/**
 * US state choropleth for mail delivery.
 *
 * Renders an inline SVG US map (no external map tiles — privacy-safe, no
 * runtime network calls). State geometry comes from us-atlas (public-domain
 * TopoJSON); each state is shaded by its delivery rate and sized data lives in
 * the tooltip. Pieces with no volume in a state render in neutral gray.
 */

import { useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import usStatesTopo from "us-atlas/states-10m.json";
import { STATE_NAME_TO_ABBR } from "@/lib/zip-geo";

export interface StateDatum {
  state: string; // 2-letter abbr
  total: number;
  delivered: number;
}

interface Props {
  data: StateDatum[];
}

// Color ramp by delivery rate (matches the rest of the tracking UI).
function rateColor(rate: number): string {
  if (rate >= 0.9) return "#059669"; // emerald — landing well
  if (rate >= 0.5) return "#d97706"; // amber — partial
  return "#dc2626"; // rose — trouble
}

const WIDTH = 760;
const HEIGHT = 460;

export function UsStateHeatmap({ data }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);

  const byState = useMemo(() => {
    const m = new Map<string, StateDatum>();
    for (const d of data) m.set(d.state, d);
    return m;
  }, [data]);

  const { features, pathFor } = useMemo(() => {
    // topojson-client types are loose; cast through unknown.
    const fc = feature(
      usStatesTopo as unknown as Parameters<typeof feature>[0],
      (usStatesTopo as unknown as { objects: { states: unknown } }).objects.states as never,
    ) as unknown as FeatureCollection<Geometry, { name: string }>;
    const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], fc);
    const pathFor = geoPath(projection);
    return { features: fc.features, pathFor };
  }, []);

  const totalPieces = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height="auto"
        role="img"
        aria-label="US map of mail delivery by state"
      >
        {features.map((f, i) => {
          const abbr = STATE_NAME_TO_ABBR[f.properties?.name ?? ""];
          const datum = abbr ? byState.get(abbr) : undefined;
          const rate = datum && datum.total ? datum.delivered / datum.total : 0;
          const fill = datum ? rateColor(rate) : "#f1f5f9";
          // Fade low-volume states so the targeted ones stand out.
          const opacity = datum
            ? Math.max(0.35, Math.min(1, 0.35 + datum.total / (totalPieces || 1) * 3))
            : 1;
          const d = pathFor(f) ?? undefined;
          return (
            <path
              key={i}
              d={d}
              fill={fill}
              fillOpacity={opacity}
              stroke="#ffffff"
              strokeWidth={0.75}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                const label = datum
                  ? `${f.properties?.name}: ${datum.total.toLocaleString()} pieces · ${Math.round(rate * 100)}% delivered`
                  : `${f.properties?.name}: no pieces`;
                setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, label });
              }}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: datum ? "pointer" : "default" }}
            />
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: hover.x + 12, top: hover.y + 12, maxWidth: 240 }}
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
        <span className="ml-auto text-gray-400">Shading intensity = volume</span>
      </div>
    </div>
  );
}
