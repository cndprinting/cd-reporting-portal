"use client";

/**
 * Customer packages view — see prepaid piece balances for your company.
 */

import { useEffect, useState } from "react";
import { Layers, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MailPackage {
  id: string;
  name: string;
  totalPieces: number;
  usedPieces: number;
  price: number;
  pricePerPiece: number;
  status: string;
  purchasedAt: string;
  expiresAt: string | null;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<MailPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((d) => setPackages(d.packages ?? []))
      .finally(() => setLoading(false));
  }, []);

  const active = packages.filter((p) => p.status === "ACTIVE");
  const totalRemaining = active.reduce((s, p) => s + (p.totalPieces - p.usedPieces), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Packages</h1>
          <p className="text-sm text-gray-500">
            Prepaid mail pieces available for upcoming campaigns
          </p>
        </div>
      </div>

      {active.length > 0 && (
        <Card className="bg-gradient-to-r from-brand-50 to-emerald-50 border-brand-200">
          <CardContent className="py-6 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600 uppercase tracking-wide">Available balance</div>
              <div className="text-4xl font-bold text-brand-700 mt-1">
                {totalRemaining.toLocaleString()} pieces
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Across {active.length} active package{active.length > 1 ? "s" : ""}
              </div>
            </div>
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No mail packages purchased yet.</p>
            <p className="text-xs mt-1">
              Contact your C&amp;D rep to buy a prepaid piece package and save on per-piece pricing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {packages.map((p) => {
            const remaining = p.totalPieces - p.usedPieces;
            const pct = p.totalPieces ? (p.usedPieces / p.totalPieces) * 100 : 0;
            const isLow = remaining / p.totalPieces < 0.1;
            return (
              <Card key={p.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Purchased {new Date(p.purchasedAt).toLocaleDateString()}
                      {p.expiresAt && ` · Expires ${new Date(p.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Badge
                    className={
                      p.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : p.status === "EXHAUSTED"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  >
                    {p.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Total</div>
                      <div className="font-bold text-lg">{p.totalPieces.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Used</div>
                      <div className="font-bold text-lg">{p.usedPieces.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Remaining</div>
                      <div className={`font-bold text-lg ${isLow ? "text-amber-600" : "text-emerald-700"}`}>
                        {remaining.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full ${isLow ? "bg-amber-500" : "bg-brand-500"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                      <span>{pct.toFixed(1)}% used</span>
                      <span>Price paid: ${p.price.toLocaleString()}</span>
                    </div>
                  </div>
                  {isLow && p.status === "ACTIVE" && (
                    <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                      ⚠️ Low balance — contact your C&amp;D rep to purchase another package before your
                      next campaign.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
