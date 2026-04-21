"use client";

/**
 * Customer-facing orders list — scoped to their company.
 * Admins get redirected to /dashboard/admin/orders.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Clock,
  FileCheck,
  CreditCard,
  Send,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Order {
  id: string;
  orderCode: string;
  description: string | null;
  quantity: number;
  dropDate: string | null;
  totalPrice: number | null;
  status: string;
  company: { id: string; name: string };
  campaign: { id: string; name: string; campaignCode: string };
  proof: { pdfUrl: string } | null;
  approval: { approvedAt: string } | null;
}

const STATUS_LABEL: Record<
  string,
  { label: string; icon: typeof Package; color: string; needsAction: boolean }
> = {
  DRAFT: { label: "Draft", icon: Clock, color: "bg-slate-100 text-slate-700", needsAction: false },
  IN_PREP: { label: "Being prepared", icon: Package, color: "bg-amber-100 text-amber-700", needsAction: false },
  PROOF_READY: { label: "Proof ready — approve now", icon: FileCheck, color: "bg-sky-100 text-sky-700", needsAction: true },
  APPROVED: { label: "Approved + paid", icon: CreditCard, color: "bg-violet-100 text-violet-700", needsAction: false },
  SCHEDULED: { label: "Scheduled", icon: Send, color: "bg-indigo-100 text-indigo-700", needsAction: false },
  DROPPED: { label: "In the mail", icon: Truck, color: "bg-blue-100 text-blue-700", needsAction: false },
  DELIVERING: { label: "Delivering", icon: Truck, color: "bg-blue-100 text-blue-700", needsAction: false },
  COMPLETE: { label: "Complete", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700", needsAction: false },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "bg-rose-100 text-rose-700", needsAction: false },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        const role = d?.user?.role;
        if (role === "ADMIN" || role === "ACCOUNT_MANAGER") {
          router.replace("/dashboard/admin/orders");
          return;
        }
        return fetch("/api/orders")
          .then((r) => r.json())
          .then((d) => setOrders(d.orders ?? []));
      })
      .finally(() => setLoading(false));
  }, [router]);

  const needsAction = orders.filter((o) => STATUS_LABEL[o.status]?.needsAction);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
            <p className="text-sm text-gray-500">
              Mailings in prep, awaiting approval, or already in the mail
            </p>
          </div>
        </div>
        <Link href="/dashboard/orders/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {needsAction.length > 0 && (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-sky-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-sky-900">
                {needsAction.length} order{needsAction.length > 1 ? "s" : ""} waiting for your approval
              </div>
              <div className="text-sky-700 text-xs mt-0.5">
                Review the merge proof, then click Approve to schedule the drop.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading your orders…</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No orders yet.</p>
            <p className="text-xs mt-1">
              Your C&amp;D rep will create orders on your behalf and send them here for approval.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const s = STATUS_LABEL[o.status] ?? STATUS_LABEL.DRAFT;
            const Icon = s.icon;
            return (
              <Link key={o.id} href={`/dashboard/orders/${o.id}`}>
                <Card
                  className={`hover:shadow-md transition-shadow ${
                    s.needsAction ? "border-sky-300 ring-1 ring-sky-200" : ""
                  }`}
                >
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex items-center justify-center h-10 w-10 rounded-lg ${s.color} shrink-0`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-mono text-sm font-semibold">{o.orderCode}</div>
                          <Badge className={s.color}>{s.label}</Badge>
                        </div>
                        <div className="text-sm text-gray-700 mt-0.5">
                          {o.description ?? "Mailing"}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {o.quantity.toLocaleString()} pieces
                          {o.dropDate && ` · Drop ${new Date(o.dropDate).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-gray-900">
                        {o.totalPrice ? `$${o.totalPrice.toFixed(2)}` : "—"}
                      </div>
                      <div className="text-xs text-brand-600 hover:underline mt-1">View →</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
