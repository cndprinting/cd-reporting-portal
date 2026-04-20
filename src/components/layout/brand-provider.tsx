"use client";

/**
 * Applies per-customer brand overrides to the dashboard:
 *   - Injects CSS custom properties on <html>: --brand-primary, --brand-accent
 *   - Exposes brand info via context (logo, name, tagline) for sidebar/header
 *
 * Tailwind classes like `bg-brand-600` remain static — the CSS vars only
 * affect things that read them (sidebar logo tile, KPI highlights, CTA buttons).
 */

import React, { createContext, useContext, useEffect, useState } from "react";

interface Brand {
  companyName: string;
  tagline: string;
  logoUrl: string | null;
  primary: string;
  accent: string;
  isCustomerBranded: boolean;
}

const DEFAULT_BRAND: Brand = {
  companyName: "cndprinting.com",
  tagline: "Reporting Portal",
  logoUrl: null,
  primary: "#0284c7",
  accent: "#f59e0b",
  isCustomerBranded: false,
};

const BrandContext = createContext<Brand>(DEFAULT_BRAND);

export function useBrand() {
  return useContext(BrandContext);
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);

  useEffect(() => {
    fetch("/api/me/brand")
      .then((r) => r.json())
      .then((b: Brand) => setBrand(b))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--brand-primary", brand.primary);
    document.documentElement.style.setProperty("--brand-accent", brand.accent);
  }, [brand.primary, brand.accent]);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}
