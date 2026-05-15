"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";

/**
 * Industries dropdown for the public site header.
 * Hover-opens on desktop, click on mobile. Closes on outside-click or Escape.
 */
export function IndustriesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-4 h-10 rounded text-ink text-sm font-medium hover:bg-paper-soft transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        Industries
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full pt-1 w-72"
          // padding-top creates a hover bridge so the menu doesn't close
          // when the cursor crosses the gap between trigger and panel
        >
          <div className="rounded-lg border border-line bg-white shadow-lg overflow-hidden">
            {INDUSTRIES.map((ind) => (
              <Link
                key={ind.slug}
                href={`/industries/${ind.slug}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 hover:bg-paper-soft transition-colors border-b border-line last:border-0"
              >
                <div className="text-sm font-semibold text-ink">{ind.nav}</div>
                <div className="text-xs text-stone mt-0.5 leading-snug">
                  {ind.tagline}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
