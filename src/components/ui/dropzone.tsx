"use client";

/**
 * <DropZone> — file upload region with real drag-and-drop support.
 *
 * Usage:
 *   <DropZone
 *     accept=".csv,.xlsx,.txt"
 *     disabled={uploading}
 *     onFile={(file) => handle(file)}
 *   >
 *     <FileSpreadsheet className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
 *     <div className="text-sm font-medium">
 *       {uploading ? "Uploading…" : "Click or drag to upload"}
 *     </div>
 *     <div className="text-xs text-gray-400">CSV, XLSX, or TXT · max 20 MB</div>
 *   </DropZone>
 *
 * - Click anywhere in the region opens the file picker
 * - Drag a file over the region: border highlights
 * - Drop the file: onFile fires
 * - Disabled state ignores both clicks and drops
 */

import React, { useRef, useState } from "react";

interface DropZoneProps {
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  children: React.ReactNode;
  /** Tone for the border and hover. Defaults to brand. */
  tone?: "brand" | "emerald" | "violet" | "sky" | "amber";
  className?: string;
}

const TONES: Record<NonNullable<DropZoneProps["tone"]>, { border: string; bg: string; ring: string }> = {
  brand: { border: "border-brand-400", bg: "bg-brand-50", ring: "ring-brand-200" },
  emerald: { border: "border-emerald-400", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  violet: { border: "border-violet-400", bg: "bg-violet-50", ring: "ring-violet-200" },
  sky: { border: "border-sky-400", bg: "bg-sky-50", ring: "ring-sky-200" },
  amber: { border: "border-amber-400", bg: "bg-amber-50", ring: "ring-amber-200" },
};

export function DropZone({
  accept,
  disabled,
  onFile,
  children,
  tone = "brand",
  className = "",
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const t = TONES[tone];

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHover(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setHover(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      className={`block border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
        disabled
          ? "opacity-60 pointer-events-none border-gray-300"
          : hover
          ? `${t.border} ${t.bg} ring-4 ${t.ring}`
          : `border-gray-300 hover:${t.border} hover:${t.bg}`
      } ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {children}
    </div>
  );
}
