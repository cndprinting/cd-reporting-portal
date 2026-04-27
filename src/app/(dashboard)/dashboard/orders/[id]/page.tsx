"use client";

/**
 * Order detail — shows full lifecycle state + role-appropriate actions:
 *   Admin: upload proof, mark dropped, cancel
 *   Customer: view proof, approve + pay
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
  CreditCard,
  Truck,
  Clock,
  ArrowLeft,
  RotateCw,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderCode: string;
  description: string | null;
  quantity: number;
  dropDate: string | null;
  mailClass: string | null;
  mailShape: string | null;
  pricePerPiece: number | null;
  setupFee: number | null;
  totalPrice: number | null;
  status: string;
  paidAt: string | null;
  droppedAt: string | null;
  createdAt: string;
  mailingListUrl: string | null;
  mailingListFileName: string | null;
  mailingListUploadedAt: string | null;
  // Final quantity reconciliation (after AccuZIP cleansing)
  finalQuantity: number | null;
  finalTotalPrice: number | null;
  quantityAdjustedAt: string | null;
  cleansedListUrl: string | null;
  cleansedListFileName: string | null;
  cleansedListUploadedAt: string | null;
  cleansedListRowCount: number | null;
  stripeRefundId: string | null;
  stripeRefundAmount: number | null;
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
    stripeCustomerId: string | null;
  };
  campaign: { id: string; name: string; campaignCode: string };
  package: { id: string; name: string; totalPieces: number; usedPieces: number } | null;
  proof: {
    pdfUrl: string;
    fileName: string | null;
    notes: string | null;
    uploadedAt: string;
  } | null;
  approval: {
    approvedByName: string;
    approvedAt: string;
    amountCharged: number;
  } | null;
}

interface SessionUser {
  id: string;
  role: string;
  companyId: string | null;
  name: string;
}

const STATUS_FLOW = [
  { key: "DRAFT", label: "Draft" },
  { key: "IN_PREP", label: "In Prep" },
  { key: "PROOF_READY", label: "Proof Ready" },
  { key: "APPROVED", label: "Approved" },
  { key: "DROPPED", label: "Dropped" },
  { key: "DELIVERING", label: "Delivering" },
  { key: "COMPLETE", label: "Complete" },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [me, setMe] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [proofNotes] = useState("");

  const reload = () => {
    setLoading(true);
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then(setOrder)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null));
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // If we came back from Stripe Checkout, verify + approve
  useEffect(() => {
    if (typeof window === "undefined" || !id) return;
    const sp = new URLSearchParams(window.location.search);
    const stripeSession = sp.get("stripe_session");
    if (stripeSession) {
      fetch(`/api/orders/${id}/checkout?session_id=${stripeSession}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            setMsg({ ok: true, text: "Payment captured — order approved" });
            reload();
          } else {
            setMsg({ ok: false, text: d.error ?? "Payment verification failed" });
          }
          // Clean URL
          window.history.replaceState({}, "", `/dashboard/orders/${id}`);
        });
    } else if (sp.get("stripe_cancelled")) {
      setMsg({ ok: false, text: "Payment cancelled" });
      window.history.replaceState({}, "", `/dashboard/orders/${id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isAdmin = me?.role === "ADMIN" || me?.role === "ACCOUNT_MANAGER";
  const isCustomer = me?.role === "CUSTOMER";

  const run = async (label: string, fn: () => Promise<Response>) => {
    setBusy(label);
    setMsg(null);
    try {
      const r = await fn();
      const data = await r.json();
      if (!r.ok) {
        setMsg({ ok: false, text: data.error ?? "Request failed" });
      } else {
        setMsg({ ok: true, text: `${label} succeeded` });
        reload();
      }
    } finally {
      setBusy(null);
    }
  };

  if (loading || !order) {
    return <div className="flex items-center justify-center h-96 text-gray-500">Loading…</div>;
  }

  const activeStep = STATUS_FLOW.findIndex((s) => s.key === order.status);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={isAdmin ? "/dashboard/admin/orders" : "/dashboard/orders"}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> Back to orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{order.orderCode}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {order.description ?? "Mailing"} · {order.company.name}
          </p>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div>
            <div className="text-3xl font-bold text-gray-900">
              {order.totalPrice ? `$${order.totalPrice.toFixed(2)}` : "—"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {order.quantity.toLocaleString()} pieces
            </div>
          </div>
          {/* Repeat this order — only shown for completed/dropped orders */}
          {["DROPPED", "DELIVERING", "COMPLETE"].includes(order.status) && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy === "Repeat"}
              onClick={() =>
                run("Repeat", async () => {
                  const r = await fetch(`/api/orders/${id}/repeat`, { method: "POST" });
                  if (r.ok) {
                    const newOrder = await r.json();
                    setTimeout(() => router.push(`/dashboard/orders/${newOrder.id}`), 600);
                  }
                  return r;
                })
              }
            >
              <RotateCw className="h-3 w-3 mr-1" />
              {busy === "Repeat" ? "Cloning…" : "Repeat this order"}
            </Button>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-lg p-3 text-sm ${
            msg.ok ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Lifecycle progress */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center gap-2 overflow-x-auto">
            {STATUS_FLOW.map((step, i) => {
              const isActive = i === activeStep;
              const isComplete = i < activeStep;
              return (
                <div key={step.key} className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-semibold ${
                      isComplete
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-brand-500 text-white ring-4 ring-brand-100"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isComplete ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-xs ${
                      isActive
                        ? "font-semibold text-gray-900"
                        : isComplete
                        ? "text-gray-700"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`h-px w-6 ${isComplete ? "bg-emerald-500" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mailing List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Mailing List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.mailingListUrl ? (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="h-8 w-8 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {order.mailingListFileName ?? "Mailing list"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Uploaded{" "}
                    {order.mailingListUploadedAt
                      ? new Date(order.mailingListUploadedAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={order.mailingListUrl}
                  download
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
                >
                  <Download className="h-3 w-3" /> Download
                </a>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy === "Remove list"}
                    onClick={() =>
                      run("Remove list", () =>
                        fetch(`/api/orders/${id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            mailingListUrl: null,
                            mailingListFileName: null,
                          }),
                        }),
                      )
                    }
                  >
                    Replace
                  </Button>
                )}
              </div>
            </div>
          ) : isAdmin ? (
            <MailingListUploader orderId={id!} onUploaded={reload} />
          ) : (
            <div className="text-sm text-gray-400 italic">
              No list uploaded yet. Your C&amp;D rep will attach it when it's ready.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin-only: upload AccuZIP Mail.dat output for this order */}
      {isAdmin && <MailDatUploadCard orderId={id!} orderCode={order.orderCode} />}

      {/* Final Quantity Reconciliation — visible to both admin + customer
          (admin can adjust, customer sees the result) */}
      <FinalQuantityCard order={order} isAdmin={isAdmin} orderId={id!} onUpdate={reload} />

      {/* Retargeting upsell — shown to customers only, after approval */}
      {isCustomer && ["APPROVED", "DROPPED", "DELIVERING", "COMPLETE"].includes(order.status) && (
        <RetargetingUpsellCard orderId={id!} />
      )}

      {/* Order details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Campaign</div>
                <div className="font-medium">{order.campaign.name}</div>
                <div className="text-xs text-gray-500">{order.campaign.campaignCode}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Customer</div>
                <div className="font-medium">{order.company.name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Quantity</div>
                <div className="font-medium">{order.quantity.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Drop Date</div>
                <div className="font-medium">
                  {order.dropDate
                    ? new Date(order.dropDate).toLocaleDateString()
                    : "Not scheduled"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Mail Class</div>
                <div className="font-medium">{order.mailClass ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Shape</div>
                <div className="font-medium">{order.mailShape ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Price / Piece</div>
                <div className="font-medium">
                  {order.pricePerPiece ? `$${order.pricePerPiece.toFixed(3)}` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Total</div>
                <div className="font-bold text-lg">
                  {order.totalPrice ? `$${order.totalPrice.toFixed(2)}` : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proof panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Merge Proof
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.proof ? (
              <div className="space-y-3">
                <a
                  href={order.proof.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg bg-brand-50 border border-brand-200 p-3 text-center hover:bg-brand-100 transition-colors"
                >
                  <FileCheck className="h-6 w-6 mx-auto text-brand-600 mb-1" />
                  <div className="text-sm font-medium text-brand-900">
                    {order.proof.fileName ?? "View proof"}
                  </div>
                  <div className="text-xs text-brand-700 mt-0.5">
                    Uploaded {new Date(order.proof.uploadedAt).toLocaleDateString()}
                  </div>
                </a>
                {order.proof.notes && (
                  <div className="text-xs text-gray-600 italic">{order.proof.notes}</div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-400">
                <FileCheck className="h-6 w-6 mx-auto mb-2 opacity-40" />
                Proof not uploaded yet
              </div>
            )}

            {isAdmin && <ProofUploader orderId={id!} notes={proofNotes} onUploaded={reload} />}
          </CardContent>
        </Card>
      </div>

      {/* Approval / Payment panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Approval &amp; Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.approval ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-emerald-900">
                    Approved by {order.approval.approvedByName}
                  </div>
                  <div className="text-xs text-emerald-700 mt-1">
                    {new Date(order.approval.approvedAt).toLocaleString()} ·{" "}
                    {order.approval.amountCharged
                      ? `$${order.approval.amountCharged.toFixed(2)} charged`
                      : "No charge"}
                  </div>
                </div>
              </div>
            </div>
          ) : order.status === "PROOF_READY" ? (
            <div className="space-y-3">
              {isCustomer && (
                <>
                  <p className="text-sm text-gray-700">
                    Review the merge proof above. When you&rsquo;re ready, click Approve — the
                    ${order.totalPrice?.toFixed(2) ?? "total"} will be charged to your card on
                    file and we&rsquo;ll schedule the drop immediately.
                  </p>
                  {!order.company.stripeCustomerId && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        No card on file yet. Your C&amp;D rep will invoice you separately for this order.
                      </div>
                    </div>
                  )}
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="lg"
                    disabled={busy === "Approve"}
                    onClick={async () => {
                      setBusy("Approve");
                      setMsg(null);
                      try {
                        const hasPrice = (order.totalPrice ?? 0) > 0;
                        const drawsFromPackage = !!order.package;

                        // If drawing from package, skip Stripe entirely
                        if (drawsFromPackage || !hasPrice) {
                          const r = await fetch(`/api/orders/${id}/approve`, {
                            method: "POST",
                          });
                          const d = await r.json();
                          if (!r.ok) setMsg({ ok: false, text: d.error ?? "Failed" });
                          else {
                            setMsg({ ok: true, text: "Order approved" });
                            reload();
                          }
                          return;
                        }

                        // Has price — try card on file first; fall back to Checkout
                        if (order.company.stripeCustomerId) {
                          const r = await fetch(`/api/orders/${id}/approve`, {
                            method: "POST",
                          });
                          const d = await r.json();
                          if (r.ok) {
                            setMsg({
                              ok: true,
                              text: d.paymentCaptured
                                ? "Card charged — order approved"
                                : "Order approved",
                            });
                            reload();
                            return;
                          }
                          // If card charge failed, fall through to Checkout
                          console.warn(
                            "[approve] card-on-file charge failed, falling back to Checkout:",
                            d.error,
                          );
                        }

                        // No card on file — redirect to Stripe Checkout
                        const co = await fetch(`/api/orders/${id}/checkout`, {
                          method: "POST",
                        });
                        const coData = await co.json();
                        if (!co.ok) {
                          setMsg({
                            ok: false,
                            text: coData.error ?? "Failed to start checkout",
                          });
                          return;
                        }
                        window.location.href = coData.url;
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    {busy === "Approve"
                      ? "Processing…"
                      : order.package
                      ? `Approve (draw from package)`
                      : (order.totalPrice ?? 0) > 0
                      ? order.company.stripeCustomerId
                        ? `Approve & Charge $${order.totalPrice?.toFixed(2)}`
                        : `Approve & Pay $${order.totalPrice?.toFixed(2)}`
                      : "Approve"}
                  </Button>
                </>
              )}
              {isAdmin && (
                <div className="text-sm text-gray-600">
                  Waiting for customer to approve. They&rsquo;ll see the proof and click Approve in their portal.
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">
              Approval unlocks once the merge proof is uploaded.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drop + tracking panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Drop &amp; Delivery
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.droppedAt ? (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
              <Truck className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-blue-900">
                  Dropped {new Date(order.droppedAt).toLocaleString()}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  USPS scans will start flowing in within 24&ndash;48 hours. Track in the Mail
                  Tracking dashboard.
                </div>
                <Link
                  href={`/dashboard/mail`}
                  className="text-xs font-medium text-blue-900 hover:underline inline-flex items-center gap-1 mt-2"
                >
                  View tracking →
                </Link>
              </div>
            </div>
          ) : order.status === "APPROVED" && isAdmin ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                When the mail has been handed to USPS, click Mark Dropped to notify the customer
                and start tracking.
              </p>
              <Button
                disabled={busy === "Mark Dropped"}
                onClick={() =>
                  run("Mark Dropped", () =>
                    fetch(`/api/orders/${id}/drop`, { method: "POST" }),
                  )
                }
              >
                <Truck className="h-4 w-4 mr-1" />
                {busy === "Mark Dropped" ? "Marking…" : "Mark as Dropped"}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">
              <Clock className="h-4 w-4 inline mr-1" />
              Drop will happen after approval &amp; payment.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * ProofUploader — admin can either upload a PDF file directly or paste a URL.
 * Uploaded files go to Vercel Blob and become the proof's pdfUrl automatically.
 */
function ProofUploader({
  orderId,
  notes: _notes,
  onUploaded,
}: {
  orderId: string;
  notes: string;
  onUploaded: () => void;
}) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [localNotes, setLocalNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submitUrl = async (pdfUrl: string) => {
    const r = await fetch(`/api/orders/${orderId}/proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfUrl, notes: localNotes }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || "Proof submit failed");
    }
    onUploaded();
  };

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/uploads", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error ?? "Upload failed");
      await submitUrl(upData.url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!url) return;
    setUploading(true);
    setErr(null);
    try {
      await submitUrl(url);
      setUrl("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
            mode === "upload" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
            mode === "url" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Paste URL
        </button>
      </div>

      <Input
        placeholder="Notes (optional)"
        value={localNotes}
        onChange={(e) => setLocalNotes(e.target.value)}
        className="text-xs"
      />

      {mode === "upload" ? (
        <label
          className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            uploading ? "opacity-60 pointer-events-none" : "border-gray-300 hover:border-brand-400 hover:bg-brand-50"
          }`}
        >
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0])}
          />
          <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
          <div className="text-xs font-medium text-gray-700">
            {uploading ? "Uploading…" : "Click to upload PDF or image"}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Max 20 MB</div>
        </label>
      ) : (
        <div className="space-y-2">
          <Input
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-xs"
          />
          <Button
            size="sm"
            className="w-full"
            disabled={!url || uploading}
            onClick={handlePasteSubmit}
          >
            <Upload className="h-3 w-3 mr-1" />
            {uploading ? "Saving…" : "Save Proof URL"}
          </Button>
        </div>
      )}

      {err && (
        <div className="rounded-md bg-rose-50 border border-rose-200 p-2 text-xs text-rose-900">
          {err}
        </div>
      )}
    </div>
  );
}

/**
 * MailingListUploader — admin uploads the customer's recipient list (CSV/XLSX/TXT).
 * File goes to Vercel Blob, then we PATCH the Order with the URL + filename.
 */
function MailingListUploader({
  orderId,
  onUploaded,
}: {
  orderId: string;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handle = async (file: File) => {
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/uploads", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error ?? "Upload failed");

      const patch = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailingListUrl: upData.url,
          mailingListFileName: file.name,
        }),
      });
      if (!patch.ok) {
        const d = await patch.json();
        throw new Error(d.error ?? "Failed to attach list to order");
      }
      onUploaded();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label
        className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          uploading
            ? "opacity-60 pointer-events-none"
            : "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50"
        }`}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls,.txt,text/csv"
          className="hidden"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
        />
        <FileSpreadsheet className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
        <div className="text-sm font-medium text-gray-700">
          {uploading ? "Uploading list…" : "Click to upload recipient list"}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          CSV, XLSX, or TXT · max 20 MB
        </div>
      </label>
      {err && (
        <div className="rounded-md bg-rose-50 border border-rose-200 p-2 text-xs text-rose-900">
          {err}
        </div>
      )}
    </div>
  );
}

/**
 * Final Quantity card — shown on every order.
 *   Admin: enter adjusted count + optionally upload the cleansed list.
 *          System recomputes price and fires Stripe partial refund if already paid.
 *   Customer: read-only — shows original → final, refund (if any), cleansed list download.
 */
function FinalQuantityCard({
  order,
  isAdmin,
  orderId,
  onUpdate,
}: {
  order: OrderDetail;
  isAdmin: boolean;
  orderId: string;
  onUpdate: () => void;
}) {
  const [finalQty, setFinalQty] = useState<string>(
    order.finalQuantity?.toString() ?? "",
  );
  const [uploading, setUploading] = useState(false);
  const [cleansedUrl, setCleansedUrl] = useState<string | null>(order.cleansedListUrl);
  const [cleansedName, setCleansedName] = useState<string | null>(order.cleansedListFileName);
  const [cleansedRows, setCleansedRows] = useState<number | null>(order.cleansedListRowCount);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const previewQty = finalQty ? parseInt(finalQty, 10) : null;
  const pricePerPiece = order.pricePerPiece ?? 0;
  const setupFee = order.setupFee ?? 0;
  const previewTotal =
    previewQty !== null && Number.isFinite(previewQty)
      ? +(previewQty * pricePerPiece + setupFee).toFixed(2)
      : null;
  const originalTotal = order.totalPrice ?? 0;
  const previewRefund =
    previewTotal !== null && order.paidAt ? Math.max(0, +(originalTotal - previewTotal).toFixed(2)) : 0;

  const hasAdjustment = order.finalQuantity != null && !!order.quantityAdjustedAt;
  const removedPieces = hasAdjustment ? order.quantity - (order.finalQuantity ?? 0) : 0;
  const removedPct = hasAdjustment && order.quantity > 0 ? (removedPieces / order.quantity) * 100 : 0;

  const uploadCleansedList = async (file: File) => {
    setUploading(true);
    setErr(null);
    try {
      const upRes = await fetch(
        `/api/uploads?filename=${encodeURIComponent(file.name)}&kind=cleansed-list`,
        { method: "POST", body: file },
      );
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error ?? "Upload failed");
      setCleansedUrl(upData.url);
      setCleansedName(file.name);
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const rowsNoHeader = Math.max(0, lines.length - 1);
        setCleansedRows(rowsNoHeader);
        if (!finalQty) setFinalQty(String(rowsNoHeader));
      } catch {
        /* non-CSV, skip row count */
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!finalQty) {
      setErr("Enter a final quantity");
      return;
    }
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch(`/api/orders/${orderId}/adjust-quantity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalQuantity: parseInt(finalQty, 10),
          cleansedListUrl: cleansedUrl,
          cleansedListFileName: cleansedName,
          cleansedListRowCount: cleansedRows,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error ?? "Failed to apply adjustment");
        return;
      }
      setMsg(
        d.refundAmount
          ? `Adjustment applied — $${d.refundAmount.toFixed(2)} refunded to customer card.`
          : "Adjustment applied.",
      );
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin && !hasAdjustment) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          Final Quantity{" "}
          {hasAdjustment && <Badge className="ml-2 bg-emerald-100 text-emerald-700">Adjusted</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAdjustment ? (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Original</div>
                <div className="text-xl font-bold text-gray-700 mt-1">
                  {order.quantity.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">${originalTotal.toFixed(2)}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="text-[10px] uppercase tracking-wider text-emerald-700">Final</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  {order.finalQuantity?.toLocaleString() ?? "—"}
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  ${order.finalTotalPrice?.toFixed(2) ?? "—"}
                </div>
              </div>
              <div className="rounded-lg bg-sky-50 border border-sky-200 p-3">
                <div className="text-[10px] uppercase tracking-wider text-sky-700">
                  {order.stripeRefundAmount ? "Refunded" : "Removed"}
                </div>
                <div className="text-xl font-bold text-sky-700 mt-1">
                  {order.stripeRefundAmount
                    ? `$${order.stripeRefundAmount.toFixed(2)}`
                    : removedPieces.toLocaleString()}
                </div>
                <div className="text-xs text-sky-700 mt-0.5">{removedPct.toFixed(1)}% cleansed</div>
              </div>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 rounded-md p-3 leading-relaxed">
              Mailing list was processed through USPS CASS certification and NCOA validation.
              Duplicate, undeliverable, and forwarded addresses were removed.
              {order.stripeRefundAmount
                ? ` The customer was automatically refunded $${order.stripeRefundAmount.toFixed(2)} for the removed pieces.`
                : " The customer's charge will reflect only the validated count."}
              {order.quantityAdjustedAt && (
                <>
                  {" "}
                  <span className="text-gray-400">
                    Adjusted {new Date(order.quantityAdjustedAt).toLocaleString()}.
                  </span>
                </>
              )}
            </div>

            {order.cleansedListUrl && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileSpreadsheet className="h-6 w-6 text-sky-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {order.cleansedListFileName ?? "Cleansed list"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.cleansedListRowCount?.toLocaleString() ?? "—"} rows · uploaded{" "}
                      {order.cleansedListUploadedAt
                        ? new Date(order.cleansedListUploadedAt).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>
                <a
                  href={order.cleansedListUrl}
                  download
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
                >
                  <Download className="h-3 w-3" /> Download
                </a>
              </div>
            )}

            {isAdmin && (
              <div className="pt-2 border-t text-xs text-gray-500">
                Need to re-adjust? Update the Final Quantity below.
                <div className="mt-2 flex gap-2 items-end">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">
                      New Final Quantity
                    </label>
                    <Input
                      type="number"
                      className="w-32"
                      value={finalQty}
                      onChange={(e) => setFinalQty(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Update"}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xs text-gray-600 leading-relaxed">
              Enter the AccuZIP-validated count (after CASS / NCOA / dedupe). The price will
              automatically recalculate
              {order.paidAt
                ? " and Stripe will refund the difference to the customer's card"
                : ""}
              . You can also upload the cleansed list so the customer can see what&rsquo;s
              actually mailing.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Original Quantity
                </label>
                <div className="h-10 rounded-md border border-gray-200 bg-gray-50 flex items-center px-3 text-sm text-gray-600">
                  {order.quantity.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Final Quantity *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 4732"
                  value={finalQty}
                  onChange={(e) => setFinalQty(e.target.value)}
                  max={order.quantity}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">New Total</label>
                <div className="h-10 rounded-md border border-gray-200 bg-emerald-50 text-emerald-900 flex items-center px-3 text-sm font-semibold">
                  {previewTotal !== null ? `$${previewTotal.toFixed(2)}` : "—"}
                </div>
              </div>
            </div>

            {previewRefund > 0 && (
              <div className="rounded-md bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900">
                <strong>Refund preview:</strong> ${previewRefund.toFixed(2)} will be refunded to
                the customer&rsquo;s Stripe card.
              </div>
            )}

            {cleansedUrl ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileSpreadsheet className="h-6 w-6 text-sky-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{cleansedName}</div>
                    <div className="text-xs text-gray-500">
                      {cleansedRows?.toLocaleString() ?? "—"} rows
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCleansedUrl(null);
                    setCleansedName(null);
                    setCleansedRows(null);
                  }}
                >
                  Replace
                </Button>
              </div>
            ) : (
              <label
                className={`block rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
                  uploading
                    ? "border-gray-300 bg-gray-50"
                    : "border-gray-300 hover:border-sky-400 hover:bg-sky-50"
                }`}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.txt"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && uploadCleansedList(e.target.files[0])}
                />
                <Upload className="h-6 w-6 text-sky-500 mx-auto mb-1" />
                <div className="text-sm font-medium text-gray-700">
                  {uploading ? "Uploading…" : "Upload cleansed list (optional)"}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  AccuZIP output · CSV / XLSX / TXT · row count auto-populates
                </div>
              </label>
            )}

            {err && (
              <div className="rounded-md bg-rose-50 border border-rose-200 p-2 text-xs text-rose-900">
                {err}
              </div>
            )}
            {msg && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-900">
                {msg}
              </div>
            )}

            <Button
              onClick={save}
              disabled={saving || !finalQty}
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
            >
              {saving
                ? "Applying adjustment…"
                : previewRefund > 0
                ? `Apply Adjustment & Refund $${previewRefund.toFixed(2)}`
                : "Apply Adjustment"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Admin-only card: upload the AccuZIP Presort folder (as a ZIP) or just the
 * maildat.pbc file directly. Server parses IMbs, creates MailPieces tied to
 * this order's campaign so USPS scan pushes will match them.
 */
function MailDatUploadCard({ orderId, orderCode }: { orderId: string; orderCode: string }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    validImbs: number;
    inserted: number;
    skippedDuplicates: number;
    totalRowsParsed: number;
    pbcFile: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setErr(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/orders/${orderId}/ingest-maildat`, {
        method: "POST",
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error ?? "Upload failed");
        return;
      }
      setResult(d);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          AccuZIP Mail.dat Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-gray-600 leading-relaxed">
          After AccuZIP finishes the job, upload either the entire{" "}
          <strong>Presort folder</strong> as a ZIP <em>or</em> just the{" "}
          <code className="bg-gray-100 px-1 rounded">maildat.pbc</code> file. We
          extract every IMb, create a MailPiece record for each, and tie them to{" "}
          <span className="font-mono">{orderCode}</span>&rsquo;s campaign. Once
          USPS starts scanning, our push feed will match pieces to this order
          automatically.
        </div>

        {result ? (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900 space-y-1">
            <div className="font-semibold">
              ✓ Imported {result.validImbs.toLocaleString()} IMbs
            </div>
            <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-0.5">
              <div>Source file:</div>
              <div className="font-mono truncate">{result.pbcFile}</div>
              <div>Rows parsed:</div>
              <div>{result.totalRowsParsed.toLocaleString()}</div>
              <div>New MailPieces inserted:</div>
              <div>{result.inserted.toLocaleString()}</div>
              <div>Duplicates skipped:</div>
              <div>{result.skippedDuplicates.toLocaleString()}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResult(null)}
              className="mt-2"
            >
              Upload another
            </Button>
          </div>
        ) : (
          <label
            className={`block rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
              uploading
                ? "border-gray-300 bg-gray-50 pointer-events-none opacity-60"
                : "border-gray-300 hover:border-violet-400 hover:bg-violet-50"
            }`}
          >
            <input
              type="file"
              className="hidden"
              accept=".zip,.pbc"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <Upload className="h-7 w-7 text-violet-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-700">
              {uploading ? "Parsing Mail.dat…" : "Drop Presort folder ZIP or maildat.pbc"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Accepts <code className="bg-gray-100 px-1 rounded">.zip</code> or{" "}
              <code className="bg-gray-100 px-1 rounded">.pbc</code> · max 50 MB
            </div>
          </label>
        )}

        {err && (
          <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
            <div className="font-semibold">Upload failed</div>
            <div className="mt-0.5 text-xs">{err}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Retargeting upsell — shown to customers post-approval. Two products:
 *   - Website to Mailbox (mail-retargets anonymous web visitors)
 *   - Everywhere (digital ads to the people on your mail list)
 *
 * Both are placeholder-only today — clicking "Notify me" logs interest
 * and emails C&D's sales team. We'll wire to AdCellerant + LeadPost
 * once channel-partner agreements land.
 */
function RetargetingUpsellCard({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [signaled, setSignaled] = useState<Set<string>>(new Set());

  const signal = async (product: "website-to-mailbox" | "everywhere") => {
    setBusy(product);
    try {
      const r = await fetch("/api/retargeting/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, orderId }),
      });
      if (r.ok) setSignaled((prev) => new Set([...prev, product]));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-violet-900">
          ⚡ Add retargeting to this campaign
          <Badge className="ml-auto bg-violet-100 text-violet-700 text-[10px]">
            Coming Soon
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-600 leading-relaxed">
          Multiply this mailing&rsquo;s ROI with two add-ons launching soon. Click
          &ldquo;Notify me&rdquo; on either to be on the early-access list.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Website to Mailbox */}
          <div className="rounded-lg border border-violet-200 bg-white p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm text-gray-900">
                  Website to Mailbox
                </div>
                <div className="text-[11px] text-gray-500">
                  ~$0.20 per identified visitor
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              When someone visits your website but doesn&rsquo;t convert, we
              identify their physical address and auto-mail a postcard within
              1 business day. Your offer follows them home.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
              onClick={() => signal("website-to-mailbox")}
              disabled={busy === "website-to-mailbox" || signaled.has("website-to-mailbox")}
            >
              {signaled.has("website-to-mailbox")
                ? "✓ You're on the list"
                : busy === "website-to-mailbox"
                ? "Sending…"
                : "Notify me when available"}
            </Button>
          </div>

          {/* Everywhere */}
          <div className="rounded-lg border border-violet-200 bg-white p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm text-gray-900">
                  Everywhere
                </div>
                <div className="text-[11px] text-gray-500">
                  $199–499 / mo per campaign
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Digital ads on Google, Meta &amp; Instagram run against the same
              people you&rsquo;re mailing. They see your brand in their mailbox
              AND online — 70% lift in response per industry data.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
              onClick={() => signal("everywhere")}
              disabled={busy === "everywhere" || signaled.has("everywhere")}
            >
              {signaled.has("everywhere")
                ? "✓ You're on the list"
                : busy === "everywhere"
                ? "Sending…"
                : "Notify me when available"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
