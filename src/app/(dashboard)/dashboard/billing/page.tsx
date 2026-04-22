"use client";

/**
 * Customer Billing page — save a card on file so order approvals auto-charge
 * without a Checkout redirect.
 */

import { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Trash2,
  Plus,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BillingStatus {
  companyName: string;
  hasStripeCustomer: boolean;
  hasPaymentMethod: boolean;
  paymentMethod: {
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
  } | null;
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Handle return from Stripe Checkout setup flow
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const setupId = sp.get("setup");
    if (setupId && setupId !== "1") {
      fetch(`/api/billing/verify-setup?session_id=${setupId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            setMsg({ ok: true, text: "Card saved successfully" });
            load();
          } else {
            setMsg({ ok: false, text: d.error ?? "Setup failed" });
          }
          window.history.replaceState({}, "", "/dashboard/billing");
        });
    } else if (sp.get("setup_cancelled")) {
      setMsg({ ok: false, text: "Card setup cancelled" });
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, []);

  const addCard = async () => {
    setBusy("add");
    setMsg(null);
    try {
      const r = await fetch("/api/billing/setup-card", { method: "POST" });
      const d = await r.json();
      if (!r.ok) {
        setMsg({ ok: false, text: d.error ?? "Failed to start setup" });
        return;
      }
      window.location.href = d.url;
    } finally {
      setBusy(null);
    }
  };

  const removeCard = async () => {
    if (!confirm("Remove the card on file? Future orders will need Checkout to pay.")) return;
    setBusy("remove");
    setMsg(null);
    try {
      const r = await fetch("/api/billing/remove-card", { method: "POST" });
      if (r.ok) {
        setMsg({ ok: true, text: "Card removed" });
        load();
      } else {
        const d = await r.json();
        setMsg({ ok: false, text: d.error ?? "Failed to remove card" });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500">
            Save a card on file so future orders auto-charge without a redirect
          </p>
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            msg.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {msg.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-400">Loading…</div>
          ) : status?.hasPaymentMethod && status.paymentMethod ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-9 rounded-md bg-white border border-gray-200 flex items-center justify-center font-mono text-xs font-bold uppercase">
                    {status.paymentMethod.brand}
                  </div>
                  <div>
                    <div className="font-semibold">
                      •••• •••• •••• {status.paymentMethod.last4}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Expires {String(status.paymentMethod.expMonth).padStart(2, "0")}/
                      {status.paymentMethod.expYear}
                    </div>
                  </div>
                </div>
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={addCard} disabled={busy === "add"}>
                  <Plus className="h-4 w-4 mr-1" />
                  {busy === "add" ? "Redirecting…" : "Replace Card"}
                </Button>
                <Button
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={removeCard}
                  disabled={busy === "remove"}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {busy === "remove" ? "Removing…" : "Remove Card"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <CreditCard className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-900">No card on file</div>
                <div className="text-xs text-gray-500 mt-1">
                  You&rsquo;ll be redirected to Checkout each time until you save one.
                </div>
              </div>
              <Button
                onClick={addCard}
                disabled={busy === "add"}
                className="bg-brand-600 hover:bg-brand-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                {busy === "add" ? "Redirecting to Stripe…" : "Add Payment Method"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security note */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 flex items-start gap-3 text-xs text-gray-700">
        <ShieldCheck className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
        <div>
          Your card is securely tokenized and stored by Stripe. We never see your full card
          number. You can remove your card at any time.
        </div>
      </div>

      {!status?.hasStripeCustomer && !loading && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            A Stripe customer record will be created for{" "}
            <strong>{status?.companyName ?? "your company"}</strong> when you add your first
            card.
          </div>
        </div>
      )}
    </div>
  );
}
