"use client";

/**
 * Verification landing page.
 * - ?ok=1                    success → bounce to dashboard
 * - ?error=expired&email=... show "link expired" + resend button
 * - ?error=invalid-token     show generic error + link to start over
 * - ?error=missing-token     same
 *
 * The /api/auth/verify GET endpoint redirects here after stamping the
 * user's emailVerifiedAt and starting their session.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const ok = params.get("ok") === "1";
  const err = params.get("error");
  const email = params.get("email");

  // On success, auto-bounce to the dashboard after a beat so the user
  // sees the confirmation tick.
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => router.push("/dashboard/overview"), 1500);
    return () => clearTimeout(t);
  }, [ok, router]);

  if (ok) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Email confirmed.</h2>
          <p className="mt-2 text-sm text-gray-500">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return <VerifyError reason={err} email={email} />;
}

function VerifyError({ reason, email }: { reason: string | null; email: string | null }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  const expired = reason === "expired";
  const headline = expired
    ? "Link expired"
    : "We couldn't verify that link";
  const sub = expired
    ? "Verification links last 24 hours. Resend a fresh one and try again."
    : "It may have been used already, copied incorrectly, or was never issued. You can sign in to request a new link.";

  async function resend() {
    if (!email) return;
    setSendErr(null);
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setSendErr(data?.error || "Could not resend.");
      else setSent(true);
    } catch {
      setSendErr("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{headline}</h2>
        <p className="mt-2 text-sm text-gray-500">{sub}</p>

        {expired && email && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <TurnstileWidget onToken={setTurnstileToken} />
            {sendErr && (
              <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {sendErr}
              </div>
            )}
            {sent ? (
              <div className="text-sm text-emerald-700">Fresh link sent.</div>
            ) : (
              <button
                onClick={resend}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
                {sending ? "Sending…" : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          <Link href="/login" className="text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md p-8 text-center text-sm text-gray-500">Loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}
