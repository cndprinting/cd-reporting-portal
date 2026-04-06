"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber, formatPercent, formatDate } from "@/lib/utils";
import { Search, Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface MetricRow {
  date: string;
  impressions: number;
  clicks: number;
  leads: number;
  calls: number;
  qrScans: number;
  piecesDelivered: number;
  spend: number;
}

interface MetricsTableProps {
  data: MetricRow[];
  title?: string;
  pageSize?: number;
}

type SortKey = keyof MetricRow;
type SortDir = "asc" | "desc";

export function MetricsTable({ data, title, pageSize = 10 }: MetricsTableProps) {
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [page, setPage] = React.useState(0);

  const filtered = data.filter((row) =>
    formatDate(row.date).toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-0.5" />
    );
  };

  const exportCsv = () => {
    const headers = ["Date", "Impressions", "Clicks", "Leads", "Calls", "QR Scans", "Pieces Delivered", "CTR", "Spend"];
    const rows = sorted.map((r) => [
      formatDate(r.date),
      r.impressions,
      r.clicks,
      r.leads,
      r.calls,
      r.qrScans,
      r.piecesDelivered,
      r.impressions > 0 ? ((r.clicks / r.impressions) * 100).toFixed(2) + "%" : "0%",
      `$${r.spend.toFixed(2)}`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign-metrics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Filter by date..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-8 h-8 w-44 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {[
              { key: "date" as SortKey, label: "Date" },
              { key: "impressions" as SortKey, label: "Ad Displays" },
              { key: "clicks" as SortKey, label: "Clicks" },
              { key: "leads" as SortKey, label: "Leads" },
              { key: "calls" as SortKey, label: "Calls" },
              { key: "qrScans" as SortKey, label: "QR Scans" },
              { key: "piecesDelivered" as SortKey, label: "Pieces Delivered" },
            ].map((col) => (
              <TableHead key={col.key}>
                <button
                  onClick={() => handleSort(col.key)}
                  className="hover:text-gray-700 transition-colors"
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </button>
              </TableHead>
            ))}
            <TableHead>CTR</TableHead>
            <TableHead>Spend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                No data found
              </TableCell>
            </TableRow>
          ) : (
            pageData.map((row, i) => {
              const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                  <TableCell>{formatNumber(row.impressions)}</TableCell>
                  <TableCell>{formatNumber(row.clicks)}</TableCell>
                  <TableCell>{formatNumber(row.leads)}</TableCell>
                  <TableCell>{formatNumber(row.calls)}</TableCell>
                  <TableCell>{formatNumber(row.qrScans)}</TableCell>
                  <TableCell>{formatNumber(row.piecesDelivered)}</TableCell>
                  <TableCell>{formatPercent(ctr)}</TableCell>
                  <TableCell className="text-gray-600">${row.spend.toFixed(2)}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
              <Button
                key={i}
                variant={page === i ? "default" : "ghost"}
                size="icon"
                onClick={() => setPage(i)}
                className="h-7 w-7 text-xs"
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
