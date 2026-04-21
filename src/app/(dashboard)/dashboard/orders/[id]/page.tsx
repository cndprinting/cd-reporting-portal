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
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
    stripeCustomerId: string | null;
  };
  campaign: { id: string; name: string; campaignCode: string };
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

  // Proof upload form (admin)
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");

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

            {isAdmin && (
              <div className="mt-4 border-t pt-4 space-y-2">
                <label className="text-xs text-gray-600 block">Proof URL</label>
                <Input
                  placeholder="https://..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="text-xs"
                />
                <Input
                  placeholder="Notes (optional)"
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!proofUrl || busy === "Proof upload"}
                  onClick={() =>
                    run("Proof upload", () =>
                      fetch(`/api/orders/${id}/proof`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          pdfUrl: proofUrl,
                          notes: proofNotes,
                        }),
                      }),
                    )
                  }
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {busy === "Proof upload" ? "Uploading…" : "Upload Proof"}
                </Button>
              </div>
            )}
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
                    onClick={() =>
                      run("Approve", () =>
                        fetch(`/api/orders/${id}/approve`, { method: "POST" }),
                      )
                    }
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    {busy === "Approve" ? "Processing…" : "Approve & Pay"}
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
