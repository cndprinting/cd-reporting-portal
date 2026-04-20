"use client";

import { useEffect, useState } from "react";
import { Palette, ImageIcon, Save, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  brandPrimary: string | null;
  brandAccent: string | null;
  brandTagline: string | null;
}

const DEFAULT_PRIMARY = "#0284c7";
const DEFAULT_ACCENT = "#f59e0b";

export default function BrandingPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editing, setEditing] = useState<Record<string, Partial<Company>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/companies?include=branding")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []));
  }, []);

  const setField = (id: string, field: keyof Company, value: string) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const save = async (c: Company) => {
    const draft = editing[c.id];
    if (!draft) return;
    setSaving(c.id);
    try {
      await fetch(`/api/companies/${c.id}/branding`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      setCompanies((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, ...draft } : x)),
      );
      setEditing((prev) => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">White-Label Branding</h1>
          <p className="text-sm text-gray-500">
            Per-customer logo, colors, and tagline — applied automatically when that customer&apos;s users log in
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {companies.map((c) => {
          const draft = { ...c, ...editing[c.id] };
          const primary = draft.brandPrimary || DEFAULT_PRIMARY;
          const accent = draft.brandAccent || DEFAULT_ACCENT;
          const hasChanges = !!editing[c.id];

          return (
            <Card key={c.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">{c.name}</CardTitle>
                {c.logoUrl || c.brandPrimary ? (
                  <Badge className="bg-emerald-100 text-emerald-700">Branded</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600">Default (C&amp;D)</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Live preview */}
                <div className="rounded-lg border p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    {draft.logoUrl ? (
                      <img
                        src={draft.logoUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg bg-white object-contain"
                      />
                    ) : (
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: primary }}
                      >
                        {c.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {draft.brandTagline || "Campaign Reporting"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div
                      className="h-6 rounded px-3 flex items-center text-xs font-medium text-white"
                      style={{ backgroundColor: primary }}
                    >
                      Primary button
                    </div>
                    <div
                      className="h-6 rounded px-3 flex items-center text-xs font-medium text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Accent
                    </div>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> Logo URL
                    </label>
                    <Input
                      placeholder="https://customer.com/logo.png"
                      value={draft.logoUrl ?? ""}
                      onChange={(e) => setField(c.id, "logoUrl", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Primary color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primary}
                          onChange={(e) => setField(c.id, "brandPrimary", e.target.value)}
                          className="h-9 w-12 rounded border"
                        />
                        <Input
                          value={primary}
                          onChange={(e) => setField(c.id, "brandPrimary", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Accent color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accent}
                          onChange={(e) => setField(c.id, "brandAccent", e.target.value)}
                          className="h-9 w-12 rounded border"
                        />
                        <Input
                          value={accent}
                          onChange={(e) => setField(c.id, "brandAccent", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Tagline</label>
                    <Input
                      placeholder="Campaign Reporting"
                      value={draft.brandTagline ?? ""}
                      onChange={(e) => setField(c.id, "brandTagline", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <a
                    href={`/api/me/brand`}
                    className="text-xs text-gray-500 hover:underline flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" /> Preview as customer (must be logged in as one)
                  </a>
                  <Button
                    size="sm"
                    onClick={() => save(c)}
                    disabled={!hasChanges || saving === c.id}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {saving === c.id ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
