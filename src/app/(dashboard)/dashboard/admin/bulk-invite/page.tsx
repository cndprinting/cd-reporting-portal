"use client";

/**
 * Admin: bulk-invite a group of customers in one shot.
 *
 * Use case: 23 land wholesalers from Aaron's network, each becoming their
 * own peer Company in MailerCity. Paste a CSV-ish list, choose modules,
 * preview, hit send. One Company + invite token per row, emails fired
 * via Resend.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, Copy, Send, Users } from "lucide-react";
import { listAllModules } from "@/modules/registry";

interface ParsedRow {
  name: string;
  email: string;
  companyName: string;
  valid: boolean;
  reason?: string;
}

interface ResultRow {
  name: string;
  email: string;
  companyId?: string;
  companyName?: string;
  inviteUrl?: string;
  emailSent?: boolean;
  error?: string;
}

const SAMPLE = `Aaron Waxman, aaron@bhlandgroup.co, BH Land Group
Jane Smith, jane@smithland.co, Smith Land Holdings
Mike Doe, mike@example.com`;

function parseInput(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Allow tab, comma, or pipe as separator
      const parts = line.split(/[,\t|]/).map((s) => s.trim());
      const [name, email, companyName] = parts;
      const trimmedEmail = (email ?? "").toLowerCase();
      const valid = !!name && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail);
      const reason = !name
        ? "Missing name"
        : !trimmedEmail
          ? "Missing email"
          : !valid
            ? "Invalid email format"
            : undefined;
      return {
        name: name ?? "",
        email: trimmedEmail,
        companyName: companyName ?? `${name} Land`,
        valid,
        reason,
      };
    });
}

export default function BulkInvitePage() {
  const allModules = useMemo(() => listAllModules(), []);
  const [text, setText] = useState("");
  const [enabledModules, setEnabledModules] = useState<string[]>(["land-investor"]);
  const [sendEmails, setSendEmails] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  const parsed = useMemo(() => parseInput(text), [text]);
  const validCount = parsed.filter((r) => r.valid).length;
  const invalidCount = parsed.length - validCount;

  const submit = async () => {
    setSubmitting(true);
    setResults(null);
    try {
      const r = await fetch("/api/admin/bulk-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rows: parsed
            .filter((r) => r.valid)
            .map((r) => ({
              name: r.name,
              email: r.email,
              companyName: r.companyName,
            })),
          enabledModules,
          sendEmails,
        }),
      });
      const d = await r.json();
      setResults(d.created ?? []);
    } finally {
      setSubmitting(false);
    }
  };

  const copyAllLinks = () => {
    if (!results) return;
    const txt = results
      .filter((r) => r.inviteUrl)
      .map((r) => `${r.name} (${r.email}): ${r.inviteUrl}`)
      .join("\n");
    navigator.clipboard.writeText(txt);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Bulk Invite</h1>
          <p className="text-sm text-stone">
            Onboard a group of customers at once. Each gets their own Company,
            invite link, and welcome email.
          </p>
        </div>
      </div>

      {!results && (
        <>
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle>Paste your list</CardTitle>
              <p className="text-xs text-stone">
                One row per person. Format:{" "}
                <code className="bg-paper-soft px-1 rounded">Name, Email, Company Name</code>{" "}
                (company name optional — defaults to <em>Name Land</em>). Tab,
                comma, or pipe separators all work.
              </p>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[220px] rounded border border-line bg-white px-3 py-2 text-sm font-mono"
                placeholder={SAMPLE}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="text-stone">
                  Parsed: <strong className="text-ink">{validCount}</strong> valid
                  {invalidCount > 0 && (
                    <span className="text-amber-700">
                      , {invalidCount} need fixing
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setText(SAMPLE)}
                  className="text-brand-600 hover:underline"
                >
                  Use sample
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Module + email options */}
          <Card>
            <CardHeader>
              <CardTitle>Setup options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-ink mb-2 uppercase tracking-wider">
                  Modules to enable on each customer
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allModules.map((m) => {
                    const on = enabledModules.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setEnabledModules((prev) =>
                            on ? prev.filter((x) => x !== m.id) : [...prev, m.id],
                          )
                        }
                        className={`text-left rounded border-2 p-3 transition-colors ${
                          on
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-line bg-white hover:border-stone"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-ink">{m.label}</div>
                          {on && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <div className="text-[11px] text-stone mt-1 leading-snug">
                          {m.tagline}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendEmails}
                  onChange={(e) => setSendEmails(e.target.checked)}
                />
                <span>
                  Send welcome email automatically
                  <span className="text-stone text-xs ml-1">
                    (uncheck to just generate invite links you can copy + send manually)
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Preview + submit */}
          {parsed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-stone uppercase tracking-wider border-b border-line">
                      <tr>
                        <th className="py-2 font-medium">Name</th>
                        <th className="font-medium">Email</th>
                        <th className="font-medium">Company</th>
                        <th className="font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((r, i) => (
                        <tr key={i} className="border-b border-line last:border-0">
                          <td className="py-2 font-medium">{r.name || <span className="text-stone">—</span>}</td>
                          <td className="text-stone">{r.email || "—"}</td>
                          <td className="text-stone">{r.companyName}</td>
                          <td>
                            {r.valid ? (
                              <Badge variant="success">Ready</Badge>
                            ) : (
                              <Badge variant="warning">{r.reason}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-end gap-3 mt-4">
                  <Button
                    size="lg"
                    disabled={submitting || validCount === 0}
                    onClick={submit}
                  >
                    <Send className="h-4 w-4" />
                    {submitting
                      ? "Creating customers…"
                      : `Create ${validCount} customer${validCount === 1 ? "" : "s"}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Results */}
      {results && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Results</CardTitle>
              <p className="text-xs text-stone mt-1">
                {results.filter((r) => !r.error).length} customer
                {results.filter((r) => !r.error).length === 1 ? "" : "s"} created
                {results.filter((r) => r.error).length > 0 &&
                  `, ${results.filter((r) => r.error).length} failed`}
                .
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyAllLinks}>
                <Copy className="h-3.5 w-3.5" />
                Copy all invite links
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResults(null);
                  setText("");
                }}
              >
                Start another batch
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-stone uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2 font-medium">Name</th>
                    <th className="font-medium">Email</th>
                    <th className="font-medium">Company</th>
                    <th className="font-medium">Email sent</th>
                    <th className="font-medium">Invite link</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="py-2 font-medium">{r.name}</td>
                      <td className="text-stone">{r.email}</td>
                      <td className="text-stone">{r.companyName ?? "—"}</td>
                      <td>
                        {r.error ? (
                          <Badge variant="destructive">{r.error}</Badge>
                        ) : r.emailSent ? (
                          <Badge variant="success">Sent</Badge>
                        ) : (
                          <Badge variant="secondary">Not sent</Badge>
                        )}
                      </td>
                      <td>
                        {r.inviteUrl ? (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(r.inviteUrl!)}
                            className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        ) : (
                          <span className="text-stone">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
