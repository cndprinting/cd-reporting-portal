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
  Check,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Calendar,
  DollarSign,
  Download,
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
  // Custom Quote path — customer skips template pricing entirely
  const [useCustomQuote, setUseCustomQuote] = useState(false);
  const [customQuoteRequest, setCustomQuoteRequest] = useState("");
  const [customQuoteUrgency, setCustomQuoteUrgency] = useState("standard");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  // Inline campaign create
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignErr, setCampaignErr] = useState<string | null>(null);
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
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => {
        const list: Campaign[] = d.campaigns ?? [];
        setCampaigns(list);
        // Auto-select if there's exactly one — customer doesn't have to think
        if (list.length === 1) setCampaignId(list[0].id);
      });
  }, []);

  const createCampaign = async () => {
    if (!newCampaignName.trim()) {
      setCampaignErr("Give the campaign a name");
      return;
    }
    setCreatingCampaign(true);
    setCampaignErr(null);
    try {
      const r = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampaignName.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setCampaignErr(d.error ?? "Couldn't create campaign");
        return;
      }
      // Add to list and auto-select
      setCampaigns((prev) => [
        ...prev,
        {
          id: d.id,
          name: d.name,
          campaignCode: d.campaignCode,
          companyId: d.companyId,
        },
      ]);
      setCampaignId(d.id);
      setShowNewCampaign(false);
      setNewCampaignName("");
    } finally {
      setCreatingCampaign(false);
    }
  };

  const rowCount = sheet?.rowCount ?? 0;
  const quality = useMemo(() => (sheet ? mappingQuality(mapping) : 0), [sheet, mapping]);
  const totalPrice =
    selectedTemplate && rowCount ? rowCount * selectedTemplate.pricePerPiece : 0;

  const canSubmit = useCustomQuote
    ? !!campaignId && customQuoteRequest.trim().length >= 10
    : !!sheet && !!fileUrl && quality >= 0.6 && !!selectedTemplate && !!campaignId;

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
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      // Create Order — branches by useCustomQuote
      const orderBody = useCustomQuote
        ? {
            campaignId,
            description: `Custom quote request: ${customQuoteRequest.slice(0, 80)}`,
            quantity: rowCount || 0,
            dropDate,
            isCustomQuote: true,
            customQuoteRequest,
            customQuoteUrgency,
            customQuoteTargetDate: dropDate,
            status: "QUOTE_REQUESTED",
          }
        : {
            campaignId,
            description: `${selectedTemplate!.name} — self-service order`,
            quantity: rowCount,
            dropDate,
            mailClass: "Marketing Mail",
            mailShape: selectedTemplate!.category,
            pricePerPiece: selectedTemplate!.pricePerPiece,
            totalPrice,
          };

      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Order create failed");
      }
      const order = await r.json();

      // Attach list + mapping (skip if no list yet for custom quote)
      if (fileUrl) {
        await fetch(`/api/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mailingListUrl: fileUrl,
            mailingListFileName: fileName,
          }),
        });
      }

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
            <div className="space-y-4">
              {/* Download template — the best UX: customer fills in exact columns we expect */}
              <div className="rounded-lg bg-brand-50 border border-brand-200 p-4 flex items-start gap-3">
                <Download className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-brand-900">
                    New to this? Download our recipient list template first.
                  </div>
                  <div className="text-xs text-brand-700 mt-0.5">
                    It has the exact columns we need. Fill it in with your recipients, save as CSV,
                    and drop it below.
                  </div>
                </div>
                <a
                  href="/api/templates/recipient-list.csv"
                  download
                  className="shrink-0 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-2 rounded-md inline-flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download template
                </a>
              </div>

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
                  Drop your filled-in spreadsheet here
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  CSV, XLSX, or TXT · if you used our template, columns auto-match
                </div>
              </label>
            </div>
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
                      ? "All columns recognized ✓"
                      : quality >= 0.6
                        ? "Review below"
                        : "Missing required fields"}
                  </Badge>
                </div>
                {quality >= 0.8 && (
                  <div className="text-xs text-emerald-700 mb-3">
                    Our template columns matched automatically. Scroll down to pick a design.
                  </div>
                )}
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
      <Card className={!sheet && !useCustomQuote ? "opacity-60 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className={`flex items-center justify-center h-6 w-6 rounded-full text-white text-xs font-bold ${
                selectedTemplate || useCustomQuote ? "bg-brand-600" : "bg-gray-400"
              }`}
            >
              2
            </span>
            Pick a template — or request a custom quote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Custom Quote tile — sits on the left */}
            <button
              type="button"
              onClick={() => {
                setUseCustomQuote(true);
                setSelectedTemplate(null);
              }}
              className={`text-left rounded-xl border-2 overflow-hidden transition-all ${
                useCustomQuote
                  ? "border-violet-500 ring-2 ring-violet-200"
                  : "border-violet-200 hover:border-violet-400"
              } bg-gradient-to-br from-violet-50 to-white`}
            >
              <div className="aspect-[3/2] flex flex-col items-center justify-center p-4 text-center">
                <div className="text-3xl mb-2">✨</div>
                <div className="text-sm font-semibold text-violet-900">
                  Custom Quote
                </div>
                <div className="text-xs text-violet-700 mt-1 leading-snug px-2">
                  Oversized mailer? Specialty stock? Odd quantity? Tell us what you
                  need — we&rsquo;ll price it for you within 1 business day.
                </div>
              </div>
              <div className="p-3 bg-white border-t border-violet-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-violet-900">
                    Tell us what you need
                  </div>
                  {useCustomQuote && <CheckCircle2 className="h-4 w-4 text-violet-600" />}
                </div>
                <div className="text-xs text-violet-700 mt-0.5">
                  Custom pricing · we respond &lt; 1 business day
                </div>
              </div>
            </button>

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
                  onClick={() => {
                    setSelectedTemplate(t);
                    setUseCustomQuote(false);
                  }}
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

          {/* Custom Quote request form — appears when the Custom Quote tile is selected */}
          {useCustomQuote && (
            <div className="mt-4 space-y-3 rounded-lg border-2 border-violet-200 bg-violet-50/30 p-4">
              <div className="text-sm font-semibold text-violet-900">
                Tell us about your custom job
              </div>
              <div>
                <label className="text-xs font-medium text-violet-900 mb-1 block">
                  What do you need? *
                </label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-violet-300 px-3 py-2 text-sm bg-white"
                  placeholder="e.g. 6x11 oversized postcard, 16pt cardstock, gloss coating, ~3,500 pieces. First-class postage. We'd like the design to match our website (https://example.com). Open to your design suggestions if helpful."
                  value={customQuoteRequest}
                  onChange={(e) => setCustomQuoteRequest(e.target.value)}
                />
                <div className="text-[11px] text-violet-700 mt-1">
                  More detail = faster quote. Mention size, paper, quantity, postage class,
                  finishing (foil, die-cut, fold), and target drop date if you have one.
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-violet-900 mb-1 block">
                  Urgency
                </label>
                <select
                  className="w-full h-10 rounded-md border border-violet-300 px-3 text-sm bg-white"
                  value={customQuoteUrgency}
                  onChange={(e) => setCustomQuoteUrgency(e.target.value)}
                >
                  <option value="standard">Standard — quote within 1 business day</option>
                  <option value="rush">Rush — need quote today</option>
                  <option value="emergency">Emergency — need to drop ASAP</option>
                </select>
              </div>

              <div className="text-xs text-violet-800 bg-white rounded p-2 border border-violet-200">
                <strong>What happens next:</strong> your C&amp;D rep gets a notification,
                builds a price (potentially with our estimating team), and sends it back.
                You&rsquo;ll get an email when it&rsquo;s ready to review. No charge until
                you accept the quote and approve the proof.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* STEP 3: PRICE + DROP DATE + SUBMIT */}
      <Card
        className={
          (!sheet && !useCustomQuote) || (!selectedTemplate && !useCustomQuote)
            ? "opacity-60 pointer-events-none"
            : ""
        }
      >
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
              {showNewCampaign ? (
                <div className="space-y-2">
                  <Input
                    placeholder="e.g. Spring 2026 Outreach"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createCampaign();
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={createCampaign}
                      disabled={creatingCampaign || !newCampaignName.trim()}
                    >
                      {creatingCampaign ? "Creating…" : "Create"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewCampaign(false);
                        setNewCampaignName("");
                        setCampaignErr(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  {campaignErr && (
                    <div className="text-xs text-rose-700">{campaignErr}</div>
                  )}
                </div>
              ) : (
                <>
                  <select
                    className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                    value={campaignId}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setShowNewCampaign(true);
                      } else {
                        setCampaignId(e.target.value);
                      }
                    }}
                  >
                    {campaigns.length === 0 && (
                      <option value="">No campaigns yet — create one →</option>
                    )}
                    {campaigns.length > 0 && (
                      <option value="">Select campaign…</option>
                    )}
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.campaignCode} — {c.name}
                      </option>
                    ))}
                    <option value="__NEW__">+ Create new campaign…</option>
                  </select>
                  <div className="text-[11px] text-gray-500 mt-1">
                    A &ldquo;campaign&rdquo; just groups related mailings. Pick an
                    existing one or create a new one.
                  </div>
                </>
              )}
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
                <DollarSign className="h-3 w-3" />{" "}
                {useCustomQuote ? "Total (from C&D)" : "Estimated total"}
              </label>
              <div className="h-9 flex items-center font-bold text-xl">
                {useCustomQuote ? (
                  <span className="text-violet-700 text-sm font-medium">
                    Quote pending
                  </span>
                ) : (
                  `$${totalPrice.toFixed(2)}`
                )}
              </div>
            </div>
          </div>

          {/* Summary box — different for the two paths */}
          {useCustomQuote ? (
            <div className="rounded-xl bg-gradient-to-r from-violet-50 to-white border border-violet-200 p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-600">Recipients</div>
                  <div className="font-bold text-lg">
                    {rowCount > 0 ? rowCount.toLocaleString() : "TBD"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Job type</div>
                  <div className="font-medium text-sm">Custom Quote</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Urgency</div>
                  <div className="font-medium text-sm capitalize">
                    {customQuoteUrgency}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Price</div>
                  <div className="font-medium text-violet-700">
                    Pending quote
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
          )}

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
              {useCustomQuote
                ? "Submitting sends your request to your C&D rep. You'll get an email when the quote is ready."
                : "Submitting creates your order. Your C&D rep will review the proof with you and then we'll charge your card on file."}
            </div>
            <Button
              size="lg"
              disabled={!canSubmit || submitting}
              onClick={submit}
              className={
                useCustomQuote
                  ? "bg-violet-600 hover:bg-violet-700"
                  : "bg-brand-600 hover:bg-brand-700"
              }
            >
              {submitting
                ? useCustomQuote ? "Sending request…" : "Submitting…"
                : useCustomQuote ? (
                    <>Request Quote <ArrowRight className="h-4 w-4 ml-1" /></>
                  ) : (
                    <>Submit Order <ArrowRight className="h-4 w-4 ml-1" /></>
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
