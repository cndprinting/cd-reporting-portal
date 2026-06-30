"use client";

/**
 * Post-signup interstitial. Tells the user we sent them a verification
 * link and gives them a Resend button. They get here from /signup once
 * the account is created.
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, RefreshCw, Check } from "lucide-react";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

function CheckEmailInner() {
  const params = useSearchParams();
  const email = params.get("email") ?? "your email";
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function resend() {
    setErr(null);
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Could not resend. Try again in a minute.");
      } else {
        setSent(true);
      }
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
        <p className="mt-2 text-sm text-gray-500">
          We sent a verification link to <strong className="text-gray-900">{email}</strong>.
          Click it to activate your account.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
        </p>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-500 mb-3">Didn&apos;t receive it?</p>
          <TurnstileWidget onToken={setTurnstileToken} />
          {err && (
            <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {err}
            </div>
          )}
          {sent ? (
            <div className="inline-flex items-center gap-2 text-sm text-emerald-700">
              <Check className="h-4 w-4" /> Verification email re-sent.
            </div>
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

        <p className="mt-6 text-center text-xs text-gray-400">
          Wrong email?{" "}
          <Link href="/signup" className="text-brand-600 hover:text-brand-700">
            Start over
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md p-8 text-center text-sm text-gray-500">Loading…</div>}>
      <CheckEmailInner />
    </Suspense>
  );
}
