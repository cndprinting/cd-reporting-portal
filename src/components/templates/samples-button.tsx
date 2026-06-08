"use client";

/**
 * "Get free samples" CTA on a template gallery card.
 *
 * Lead-capture: opens a modal, takes name/email/address, posts to /api/leads
 * with a sample_request source tag + the template short-code so we know which
 * design the prospect wanted. Mirrors the Rocket Prints play (their primary
 * conversion path) but pairs alongside our self-serve "Customize & order" CTA
 * instead of being the ONLY way to engage.
 */

import { useState } from "react";

interface Props {
  templateName: string;
  templateShortCode?: string;
}

export function SamplesButton({ templateName, templateShortCode }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.name || !form.email || !form.address) {
      setErr("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: `Sample request — mail address: ${form.address}\nTemplate: ${templateName}${templateShortCode ? ` (${templateShortCode})` : ""}`,
          industry: "sample_request",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Could not submit. Please try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-line bg-white px-3 py-2 text-sm font-medium text-stone hover:border-stone hover:text-ink"
      >
        Free samples
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center">
                <div className="mb-2 text-2xl">📬</div>
                <h3 className="font-display text-lg text-ink">Samples on the way.</h3>
                <p className="mt-1 text-sm text-stone">
                  We&apos;ll drop the {templateName} sample in the mail today. Watch your mailbox
                  in 5–7 business days. Questions in the meantime? Call us at{" "}
                  <a className="text-brand-700" href="tel:+17275729999">(727) 572-9999</a>.
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    setDone(false);
                    setForm({ name: "", email: "", address: "" });
                  }}
                  className="mt-4 rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <h3 className="font-display text-lg text-ink">Get a free sample.</h3>
                  <p className="text-sm text-stone">
                    We&apos;ll mail you the actual <b>{templateName}</b> so you can hold it. No cost, no obligation.
                  </p>
                </div>
                {err && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {err}
                  </div>
                )}
                <input
                  className="w-full rounded border border-line px-3 py-2 text-sm"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  type="email"
                  className="w-full rounded border border-line px-3 py-2 text-sm"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="w-full rounded border border-line px-3 py-2 text-sm"
                  placeholder="Mailing address (street, city, state, ZIP)"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded border border-line bg-white px-3 py-2 text-sm text-stone hover:border-stone"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Mail me a sample"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
