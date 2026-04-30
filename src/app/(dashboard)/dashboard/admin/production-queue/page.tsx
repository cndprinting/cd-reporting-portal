"use client";

/**
 * Production Queue
 *
 * Shows every order awaiting AccuZIP processing. Admin clicks "Send to
 * Production" on any row to email the recipient list + filename instructions
 * to one or more C&D production team members. Each send is logged.
 *
 * This replaces the old auto-email-on-submit flow — durable to staffing
 * changes, full audit trail, multi-recipient, optional per-send notes.
 */

import { useEffect, useState } from "react";
import { Printer, Send, Download, Clock, CheckCircle2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface QueueOrder {
  id: string;
  orderCode: string;
  status: string;
  quantity: number;
  dropDate: string | null;
  description: string | null;
  mailingListUrl: string | null;
  mailingListFileName: string | null;
  isCustomQuote: boolean;
  productionNotifiedAt: string | null;
  company: { id: string; name: string };
  campaign: { name: string; campaignCode: string };
  productionHandoffs: {
    recipients: string;
    sentAt: string;
    notes: string | null;
  }[];
}

export default function ProductionQueuePage() {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [defaultRecipients, setDefaultRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingFor, setSendingFor] = useState<QueueOrder | null>(null);
  const [recipientsInput, setRecipientsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/production-queue")
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.orders ?? []);
        setDefaultRecipients(d.defaultRecipients ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openSendModal = (order: QueueOrder) => {
    setSendingFor(order);
    setRecipientsInput(defaultRecipients.join(", "));
    setNotes("");
    setErr(null);
    setSuccess(null);
  };

  const closeSendModal = () => {
    setSendingFor(null);
    setRecipientsInput("");
    setNotes("");
    setErr(null);
  };

  const send = async () => {
    if (!sendingFor) return;
    const recipients = recipientsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      setErr("Add at least one recipient email");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/orders/${sendingFor.id}/send-to-production`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipients, notes: notes || undefined }),
        },
      );
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error ?? "Send failed");
        return;
      }
      setSuccess(`Sent to ${recipients.join(", ")}`);
      // Reload after a moment
      setTimeout(() => {
        closeSendModal();
        load();
      }, 1200);
    } finally {
      setBusy(false);
    }
  };

  const notSentYet = orders.filter((o) => o.productionHandoffs.length === 0);
  const alreadySent = orders.filter((o) => o.productionHandoffs.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-100 text-amber-700">
          <Printer className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Queue</h1>
          <p className="text-sm text-gray-500">
            Orders waiting for AccuZIP processing · click Send to email any C&amp;D
            team member with the recipient list and filename instructions
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Awaiting send
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-0.5">
              {notSentYet.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Sent · awaiting Mail.dat
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-0.5">
              {alreadySent.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              Default recipient
            </div>
            <div className="text-sm font-medium text-gray-700 mt-1 truncate">
              {defaultRecipients.join(", ") || "(not configured)"}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Set via PRODUCTION_NOTIFY_EMAIL env var. Override per-send below.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {orders.length} order{orders.length === 1 ? "" : "s"} in the queue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-sm text-gray-400 text-center py-12">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-sm font-medium text-gray-600">
                No orders waiting 🎉
              </div>
              <div className="text-xs text-gray-400 mt-1">
                When a customer attaches a recipient list, the order shows up here.
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 border-b bg-gray-50">
                <tr>
                  <th className="py-2 px-3">Order</th>
                  <th>Customer</th>
                  <th className="text-right">Qty</th>
                  <th>Drop</th>
                  <th>List</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const lastSend = o.productionHandoffs[0];
                  return (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <Link
                          href={`/dashboard/orders/${o.id}`}
                          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                        >
                          {o.orderCode}
                        </Link>
                        {o.description && (
                          <div className="text-[11px] text-gray-500 max-w-xs truncate mt-0.5">
                            {o.description}
                          </div>
                        )}
                      </td>
                      <td className="text-sm">{o.company.name}</td>
                      <td className="text-right text-sm tabular-nums">
                        {o.quantity.toLocaleString()}
                      </td>
                      <td className="text-xs text-gray-600">
                        {o.dropDate
                          ? new Date(o.dropDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        {o.mailingListUrl ? (
                          <a
                            href={o.mailingListUrl}
                            download
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            {o.mailingListFileName ?? "list"}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {lastSend ? (
                          <div>
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="h-3 w-3 mr-0.5 inline" />
                              Sent
                            </Badge>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(lastSend.sentAt).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                              to {lastSend.recipients}
                            </div>
                          </div>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700">
                            <Clock className="h-3 w-3 mr-0.5 inline" />
                            Not sent
                          </Badge>
                        )}
                      </td>
                      <td className="pr-3">
                        <Button
                          size="sm"
                          onClick={() => openSendModal(o)}
                          className={
                            lastSend
                              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              : "bg-amber-600 hover:bg-amber-700 text-white"
                          }
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {lastSend ? "Resend" : "Send"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Send modal */}
      {sendingFor && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={closeSendModal}
        >
          <Card
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Send to Production
                </CardTitle>
                <div className="text-xs text-gray-500 mt-0.5">
                  {sendingFor.orderCode} · {sendingFor.company.name} ·{" "}
                  {sendingFor.quantity.toLocaleString()} pieces
                </div>
              </div>
              <button
                onClick={closeSendModal}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Recipients (comma-separated emails)
                </label>
                <Input
                  value={recipientsInput}
                  onChange={(e) => setRecipientsInput(e.target.value)}
                  placeholder="tcamp@cndprinting.com, mike@cndprinting.com"
                />
                <div className="text-[11px] text-gray-500 mt-1">
                  Default pulled from the team list. Edit to send to a specific
                  person, or add multiple to CC.
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Note (optional)
                </label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Rush job — please prioritize. Customer wants to drop by Friday."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {sendingFor.productionHandoffs.length > 0 && (
                <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                  <strong>Heads up — already sent.</strong> Last sent{" "}
                  {new Date(
                    sendingFor.productionHandoffs[0].sentAt,
                  ).toLocaleString()}{" "}
                  to {sendingFor.productionHandoffs[0].recipients}. This will
                  send another email.
                </div>
              )}

              {err && (
                <div className="rounded-md bg-rose-50 border border-rose-200 p-2 text-xs text-rose-900">
                  {err}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-900">
                  ✓ {success}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={closeSendModal} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  onClick={send}
                  disabled={busy || !recipientsInput.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Send className="h-4 w-4 mr-1" />
                  {busy ? "Sending…" : "Send Email"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
