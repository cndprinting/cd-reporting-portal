"use client";

import React from "react";
import { cn, formatNumber } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, HelpCircle } from "lucide-react";

interface KPICardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  delta?: number;
  deltaLabel?: string;
  helpText?: string;
  format?: "number" | "currency" | "percent";
}

export function KPICard({
  label,
  value,
  icon: Icon,
  iconColor = "text-brand-600 bg-brand-100",
  delta,
  deltaLabel = "vs prior period",
  helpText,
  format = "number",
}: KPICardProps) {
  const formattedValue =
    format === "currency"
      ? `$${formatNumber(value)}`
      : format === "percent"
      ? `${value.toFixed(1)}%`
      : formatNumber(value);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("flex items-center justify-center h-10 w-10 rounded-lg", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        {helpText && (
          <Tooltip content={helpText}>
            <HelpCircle className="h-4 w-4 text-gray-300 hover:text-gray-400 cursor-help" />
          </Tooltip>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{formattedValue}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {delta >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              delta >= 0 ? "text-emerald-600" : "text-red-600"
            )}
          >
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}
