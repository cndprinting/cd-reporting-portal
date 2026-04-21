"use client";

/**
 * Customer self-service Order creation — the PostcardMania "drag + preview + pay" flow.
 *
 * Steps (all on one page, progressive):
 *   1. Upload mailing list (CSV/XLSX) → client-side parse + auto-map columns
 *   2. Pick a template → live preview renders with real recipient data
 *   3. See price + drop date → submit
 *
 * After submit, we POST to /api/orders with:
 *   - the uploaded file URL (Vercel Blob)
 *   - mapping
 *   - selected template
 *   - order details (qty=rowCount, dropDate, pricePerPiece)
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Upload,
  Check,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Calendar,
  DollarSign,
} from "lucide-react";
import {
  parseSheet,
  autoMapColumns,
  mappingQuality,
  applyMapping,
  type ColumnMapping,
  type ParsedSheet,
} from "@/lib/services/spreadsheet";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Campaign {
  id: string;
  name: string;
  campaignCode: string;
  companyId: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  size: string;
  htmlTemplate: string;
  variables: string;
  pricePerPiece: number;
  minQuantity: number;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  fullName: "Full name",
  address1: "Street address",
  address2: "Apt / Unit",
  city: "City",
  state: "State",
  zip5: "ZIP code",
  zip4: "ZIP+4",
  email: "Email",
  phone: "Phone",
  offer: "Offer / CTA",
  company: "Company",
};

export default function NewOrderPage() {
  const router = useRouter();
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [customOffer, setCustomOffer] = useState("");
  const [dropDate, setDropDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.templates ?? []));
    fetch("/api/campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? []));
  }, []);

  const rowCount = sheet?.rowCount ?? 0;
  const quality = useMemo(() => (sheet ? mappingQuality(mapping) : 0), [sheet, mapping]);
  const totalPrice =
    selectedTemplate && rowCount ? rowCount * selectedTemplate.pricePerPiece : 0;

  const canSubmit =
    !!sheet && !!fileUrl && quality >= 0.6 && !!selectedTemplate && !!campaignId;

  const handleFile = async (file: File) => {
    setParseErr(null);
    setFileName(file.name);
    try {
      const parsed = await parseSheet(file);
      if (parsed.rowCount === 0) {
        setParseErr("No rows found in file");
        return;
      }
      setSheet(parsed);
      setMapping(autoMapColumns(parsed.headers));

      // Upload to Vercel Blob in background
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/uploads", { method: "POST", body: fd });
      const upData = await up.json();
      if (up.ok) setFileUrl(upData.url);
      else setParseErr(upData.error ?? "Upload failed");
    } catch (e) {
      setParseErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || !selectedTemplate) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      // Create Order
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          description: `${selectedTemplate.name} — self-service order`,
          quantity: rowCount,
          dropDate,
          mailClass: "Marketing Mail",
          mailShape: selectedTemplate.category,
          pricePerPiece: selectedTemplate.pricePerPiece,
          totalPrice,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Order create failed");
      }
      const order = await r.json();

      // Attach list + mapping + template
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailingListUrl: fileUrl,
          mailingListFileName: fileName,
        }),
      });

      router.push(`/dashboard/orders/${order.id}`);
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Mail Campaign</h1>
          <p className="text-sm text-gray-500">
            Drop your list, pick a template, see your price, approve on the spot.
          </p>
        </div>
      </div>

      {/* STEP 1: UPLOAD LIST */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-brand-600 text-white text-xs font-bold">
              1
            </span>
            Upload your recipient list
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sheet ? (
            <label
              className={`block border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                uploading
                  ? "opacity-60 pointer-events-none"
                  : "border-gray-300 hover:border-brand-400 hover:bg-brand-50"
              }`}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <FileSpreadsheet className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <div className="text-base font-semibold text-gray-900">
                Drop your spreadsheet here
              </div>
              <div className="text-xs text-gray-500 mt-1">
                CSV, XLSX, or TXT · we&rsquo;ll auto-detect the columns
              </div>
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="font-medium text-sm">{fileName}</div>
                    <div className="text-xs text-emerald-700">
                      {rowCount.toLocaleString()} recipients · {sheet.headers.length} columns ·{" "}
                      {uploading ? "uploading…" : "ready"}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSheet(null);
                    setFileUrl(null);
                    setFileName("");
                  }}
                >
                  Change file
                </Button>
              </div>

              {/* Column mapping */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Column mapping
                  </div>
                  <Badge
                    className={
                      quality >= 0.8
                        ? "bg-emerald-100 text-emerald-700"
                        : quality >= 0.6
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                    }
                  >
                    {quality >= 0.8
                      ? "Looks great"
                      : quality >= 0.6
                        ? "OK — review below"
                        : "Missing required fields"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {(
                    [
                      "firstName",
                      "lastName",
                      "fullName",
                      "address1",
                      "address2",
                      "city",
                      "state",
                      "zip5",
                      "email",
                      "offer",
                    ] as const
                  ).map((field) => {
                    const isRequired = ["address1", "city", "state", "zip5"].includes(field);
                    return (
                      <div key={field} className="flex items-center gap-2">
                        <div className="w-28 text-xs text-gray-600 shrink-0">
                          {FIELD_LABELS[field]}
                          {isRequired && <span className="text-rose-500">*</span>}
                        </div>
                        <select
                          value={mapping[field] ?? ""}
                          onChange={(e) =>
                            setMapping({ ...mapping, [field]: e.target.value || null })
                          }
                          className="flex-1 h-8 rounded border border-gray-300 px-2 text-xs"
                        >
                          <option value="">(not used)</option>
                          {sheet.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {parseErr && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
                  {parseErr}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* STEP 2: PICK TEMPLATE */}
      <Card className={!sheet ? "opacity-60 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className={`flex items-center justify-center h-6 w-6 rounded-full text-white text-xs font-bold ${
                selectedTemplate ? "bg-brand-600" : "bg-gray-400"
              }`}
            >
              2
            </span>
            Pick a template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((t) => {
              const previewData =
                sheet && sheet.rows[0]
                  ? {
                      ...applyMapping(sheet.rows[0], mapping),
                      offer: customOffer || "Call 555-0100 today",
                    }
                  : {
                      firstName: "Alex",
                      address1: "123 Main St",
                      city: "Anytown",
                      state: "FL",
                      zip5: "32114",
                      offer: customOffer || "Call 555-0100 today",
                    };
              const rendered = renderTemplate(t.htmlTemplate, previewData);
              const isSelected = selectedTemplate?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplate(t)}
                  className={`text-left rounded-xl border-2 overflow-hidden transition-all ${
                    isSelected
                      ? "border-brand-500 ring-2 ring-brand-200"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div
                    className="aspect-[3/2] bg-gray-100"
                    dangerouslySetInnerHTML={{ __html: rendered }}
                  />
                  <div className="p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{t.name}</div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-brand-600" />}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t.size} {t.category} · ${t.pricePerPiece.toFixed(2)}/piece
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedTemplate && (
            <div className="mt-4">
              <label className="text-xs text-gray-600 mb-1 block">
                Custom offer text (goes in the &ldquo;Offer&rdquo; spot on the postcard)
              </label>
              <Input
                placeholder="Call 555-0100 for a free quote"
                value={customOffer}
                onChange={(e) => setCustomOffer(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* STEP 3: PRICE + DROP DATE + SUBMIT */}
      <Card className={!sheet || !selectedTemplate ? "opacity-60 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className={`flex items-center justify-center h-6 w-6 rounded-full text-white text-xs font-bold ${
                canSubmit ? "bg-brand-600" : "bg-gray-400"
              }`}
            >
              3
            </span>
            Review &amp; submit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Campaign *</label>
              <select
                className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">Select campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.campaignCode} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Drop date
              </label>
              <Input
                type="date"
                value={dropDate}
                onChange={(e) => setDropDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Estimated total
              </label>
              <div className="h-9 flex items-center font-bold text-xl">
                ${totalPrice.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Summary box */}
          <div className="rounded-xl bg-gradient-to-r from-brand-50 to-emerald-50 border border-brand-200 p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-600">Recipients</div>
                <div className="font-bold text-lg">{rowCount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Template</div>
                <div className="font-medium text-sm truncate">
                  {selectedTemplate?.name ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Price per piece</div>
                <div className="font-medium">
                  ${selectedTemplate?.pricePerPiece.toFixed(2) ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Total</div>
                <div className="font-bold text-lg">${totalPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {!campaignId && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Pick a campaign to group this order under. If you don&rsquo;t see the right one,
                your C&amp;D rep can create one for you.
              </div>
            </div>
          )}

          {submitErr && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
              {submitErr}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <div className="text-xs text-gray-500 flex-1">
              Submitting creates your order. Your C&amp;D rep will review the proof with you and
              then we&rsquo;ll charge your card on file.
            </div>
            <Button
              size="lg"
              disabled={!canSubmit || submitting}
              onClick={submit}
              className="bg-brand-600 hover:bg-brand-700"
            >
              {submitting ? "Submitting…" : (
                <>
                  Submit Order <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function renderTemplate(html: string, data: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = data[key];
    return v ? escapeHtml(v) : `<span style="opacity:0.5">[${key}]</span>`;
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
