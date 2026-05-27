"use client";

/**
 * Top ZIP codes by mail volume — horizontal bars colored by delivery rate.
 * Pairs with the delivery heat map; uses the same perZip rollup the map does.
 */

export interface TopZipDatum {
  zip: string;
  city: string | null;
  state: string | null;
  total: number;
  delivered: number;
}

function rateColor(rate: number): string {
  if (rate >= 0.9) return "#059669";
  if (rate >= 0.5) return "#d97706";
  return "#dc2626";
}

export function TopZipsBar({ zips, limit = 15 }: { zips: TopZipDatum[]; limit?: number }) {
  const top = [...zips].sort((a, b) => b.total - a.total).slice(0, limit);
  if (top.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-400">No ZIP-level data yet.</div>;
  }
  const max = Math.max(1, ...top.map((z) => z.total));

  return (
    <div className="space-y-1.5">
      {top.map((z) => {
        const rate = z.total ? z.delivered / z.total : 0;
        const w = (z.total / max) * 100;
        return (
          <div key={z.zip} className="flex items-center gap-3 text-xs">
            <div className="w-32 shrink-0 truncate font-medium text-gray-700" title={z.city ? `${z.city}, ${z.state}` : z.zip}>
              <span className="font-mono">{z.zip}</span>
              {z.city && <span className="ml-1 text-gray-400">{z.city}</span>}
            </div>
            <div className="relative h-4 flex-1 overflow-hidden rounded bg-gray-100">
              <div
                className="h-full rounded"
                style={{ width: `${w}%`, background: rateColor(rate) }}
              />
            </div>
            <div className="w-24 shrink-0 text-right tabular-nums text-gray-600">
              {z.total.toLocaleString()} · {Math.round(rate * 100)}%
            </div>
          </div>
        );
      })}
      <div className="mt-2 flex items-center gap-4 pt-1 text-xs text-gray-500">
        <span>Bar = pieces · color = delivery rate:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#059669" }} /> ≥90%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#d97706" }} /> 50–90%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#dc2626" }} /> &lt;50%
        </span>
      </div>
    </div>
  );
}
