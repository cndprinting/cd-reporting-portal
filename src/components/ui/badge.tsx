import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
}

const variantStyles: Record<string, string> = {
  default: "bg-brand-100 text-brand-700 border-brand-200",
  secondary: "bg-gray-100 text-gray-700 border-gray-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  destructive: "bg-red-100 text-red-700 border-red-200",
  outline: "bg-transparent text-gray-700 border-gray-300",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        // 2px corners (almost square) instead of pill shape — feels like a stamp
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
