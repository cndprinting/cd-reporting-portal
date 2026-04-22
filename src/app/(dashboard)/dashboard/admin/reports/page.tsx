"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Send,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Mailer {
  id: string;
  name: string;
  pieceCount: number;
  deliveredCount: number;
}

interface Company {
  id: string;
  name: string;
  weeklyReportEnabled: boolean;
  weeklyReportRecipients: string | null;
  lastWeeklyReportAt: string | null;
  users: { email: string; name: string | null }[];
}

export default function ScheduledReportsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [myEmail, setMyEmail] = useState<string>("");
  const [sentBanner, setSentBanner] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setMyEmail(d?.user?.email ?? ""));
  }, []);

  const load = () => {
    fetch("/api/companies?include=reportSettings")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? d ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnabled = async (c: Company, enabled: boolean) => {
    await fetch(`/api/companies/${c.id}/report-settings`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weeklyReportEnabled: enabled }),
    });
    setCompanies((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, weeklyReportEnabled: enabled } : x)),
    );
  };

  const updateRecipients = async (c: Company, recipients: string) => {
    await fetch(`/api/companies/${c.id}/report-settings`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weeklyReportRecipients: recipients }),
    });
    setCompanies((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, weeklyReportRecipients: recipients } : x)),
    );
  };

  const sendNow = async (c: Company) => {
    if (!confirm(`Send the weekly report to ${c.name}'s actual recipients right now?`)) return;
    setSendingId(c.id);
    setSentBanner(null);
    try {
      const resp = await fetch(`/api/reports/weekly/${c.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.ok) {
        setSentBanner({ ok: true, msg: `Sent to ${data.recipients.join(", ")}` });
        load();
      } else {
        setSentBanner({ ok: false, msg: data.error ?? "Send failed" });
      }
    } finally {
      setSendingId(null);
    }
  };

  const testSendToMe = async (c: Company) => {
    if (!myEmail) {
      setSentBanner({ ok: false, msg: "Couldn't detect your email" });
      return;
    }
    setTestingId(c.id);
    setSentBanner(null);
    try {
      const resp = await fetch(`/api/reports/weekly/${c.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: [myEmail] }),
      });
      const data = await resp.json();
      if (data.ok) {
        setSentBanner({
          ok: true,
          msg: `Test report for ${c.name} sent to ${myEmail}`,
        });
      } else {
        setSentBanner({ ok: false, msg: data.error ?? "Send failed" });
      }
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
          <p className="text-sm text-gray-500">
            Weekly branded email reports &middot; Mondays at 7am ET &middot; powered by Resend
          </p>
        </div>
      </div>

      {sentBanner && (
        <Card
          className={sentBanner.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}
        >
          <CardContent className="py-3 flex items-center gap-2 text-sm">
            {sentBanner.ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span className={sentBanner.ok ? "text-emerald-900" : "text-rose-900"}>
              {sentBanner.msg}
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <p className="text-sm text-gray-500">
            Enable/disable weekly emails, override recipients, preview, or send manually
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b">
                <tr>
                  <th className="py-2">Customer</th>
                  <th>Recipients</th>
                  <th>Last Sent</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="max-w-sm">
                      <Input
                        placeholder={
                          c.users?.map((u) => u.email).join(", ") ?? "All company users"
                        }
                        defaultValue={c.weeklyReportRecipients ?? ""}
                        onBlur={(e) => updateRecipients(c, e.target.value)}
                        className="text-xs"
                      />
                    </td>
                    <td className="text-xs text-gray-600">
                      {c.lastWeeklyReportAt
                        ? new Date(c.lastWeeklyReportAt).toLocaleString()
                        : "Never"}
                    </td>
                    <td>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={c.weeklyReportEnabled}
                          onChange={(e) => toggleEnabled(c, e.target.checked)}
                          className="rounded"
                        />
                        {c.weeklyReportEnabled ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Enabled</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">Paused</Badge>
                        )}
                      </label>
                    </td>
                    <td className="text-right whitespace-nowrap space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewId(c.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-700 border-amber-200 hover:bg-amber-50"
                        onClick={() => testSendToMe(c)}
                        disabled={testingId === c.id || !myEmail}
                        title={myEmail ? `Send test to ${myEmail}` : "Loading your email…"}
                      >
                        <FlaskConical className="h-3 w-3 mr-1" />
                        {testingId === c.id ? "Sending…" : "Test to Me"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => sendNow(c)}
                        disabled={sendingId === c.id}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        {sendingId === c.id ? "Sending…" : "Send Now"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-50">
        <CardContent className="py-4 text-xs text-gray-600 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              Cron fires every <strong>Monday 7am ET</strong>. Set{" "}
              <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in Vercel env.
            </span>
          </div>
          <div>
            Recipients input accepts comma-separated emails. Leave blank to send to all users of
            that company.
          </div>
        </CardContent>
      </Card>

      {/* Preview modal (iframe) */}
      {previewId && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold">Report Preview</div>
              <button onClick={() => setPreviewId(null)} className="text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>
            <iframe
              src={`/api/reports/weekly/${previewId}?format=html`}
              className="flex-1 w-full min-h-[600px] border-0"
              title="Weekly report preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
