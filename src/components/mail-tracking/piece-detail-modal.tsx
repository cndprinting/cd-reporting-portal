"use client";

import { useEffect, useState } from "react";
import {
  X,
  Mail,
  MapPin,
  Clock,
  Truck,
  CheckCircle2,
  Building2,
  Calendar,
  Package,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScanEvent {
  id: string;
  operation: string;
  operationCode: string | null;
  scanDatetime: string;
  facilityCity: string | null;
  facilityState: string | null;
  facilityZip: string | null;
  facilityType: string | null;
  machineId: string | null;
  runId: string | null;
  predictedDeliveryDate: string | null;
}

interface PieceDetail {
  id: string;
  imb: string;
  imbParsed: {
    barcodeId: string;
    serviceType: string;
    mailerId: string;
    serial: string;
    routingZip: string;
    mailerIdLength: number;
  } | null;
  recipientName: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip5: string | null;
  zip4: string | null;
  status: string;
  expectedInHomeDate: string | null;
  firstScanAt: string | null;
  deliveredAt: string | null;
  daysToDeliver: number | null;
  isSeed: boolean;
  campaign: { id: string; name: string; campaignCode: string };
  company: { id: string; name: string };
  mailBatch: {
    id: string;
    batchName: string;
    dropDate: string;
    mailerId: string | null;
    mailClass: string | null;
    mailShape: string | null;
  } | null;
  scanEvents: ScanEvent[];
}

const OP_ICONS: Record<string, typeof Mail> = {
  ORIGIN_ACCEPTANCE: Package,
  ORIGIN_PROCESSED: Building2,
  IN_TRANSIT: Truck,
  DESTINATION_PROCESSED: Building2,
  DESTINATION_DELIVERY: Building2,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
  UNDELIVERABLE: AlertCircle,
  OTHER: Clock,
};

const OP_COLORS: Record<string, string> = {
  ORIGIN_ACCEPTANCE: "bg-slate-100 text-slate-700 ring-slate-200",
  ORIGIN_PROCESSED: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_TRANSIT: "bg-amber-100 text-amber-700 ring-amber-200",
  DESTINATION_PROCESSED: "bg-sky-100 text-sky-700 ring-sky-200",
  DESTINATION_DELIVERY: "bg-sky-100 text-sky-700 ring-sky-200",
  OUT_FOR_DELIVERY: "bg-blue-100 text-blue-700 ring-blue-200",
  DELIVERED: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  UNDELIVERABLE: "bg-rose-100 text-rose-700 ring-rose-200",
};

interface Props {
  pieceId: string | null;
  onClose: () => void;
}

export function PieceDetailModal({ pieceId, onClose }: Props) {
  const [piece, setPiece] = useState<PieceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pieceId) {
      setPiece(null);
      return;
    }
    setLoading(true);
    fetch(`/api/mail-pieces/${pieceId}`)
      .then((r) => r.json())
      .then(setPiece)
      .finally(() => setLoading(false));
  }, [pieceId]);

  useEffect(() => {
    if (!pieceId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pieceId, onClose]);

  if (!pieceId) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-5 w-5 text-brand-600" />
              <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Mailpiece Detail
              </span>
              {piece?.isSeed && (
                <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">SEED</Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {piece?.recipientName ?? (loading ? "Loading…" : "—")}
            </h2>
            <div className="text-sm text-gray-500">
              {piece?.addressLine1}, {piece?.city}, {piece?.state} {piece?.zip5}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 -m-2 p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="text-center text-gray-500 py-12">Loading piece details…</div>
          )}

          {piece && (
            <>
              {/* Status card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-gray-500 text-xs mb-1">Status</div>
                  <Badge
                    className={
                      piece.status === "DELIVERED"
                        ? "bg-emerald-100 text-emerald-700"
                        : piece.status === "UNDELIVERABLE"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  >
                    {piece.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-gray-500 text-xs mb-1">Expected in-home</div>
                  <div className="font-medium">
                    {piece.expectedInHomeDate
                      ? new Date(piece.expectedInHomeDate).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-gray-500 text-xs mb-1">Delivered</div>
                  <div className="font-medium">
                    {piece.deliveredAt
                      ? new Date(piece.deliveredAt).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-gray-500 text-xs mb-1">Days to deliver</div>
                  <div className="font-medium">{piece.daysToDeliver ?? "—"}</div>
                </div>
              </div>

              {/* IMb breakdown */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Intelligent Mail Barcode
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm break-all">
                  {piece.imb}
                </div>
                {piece.imbParsed && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-xs">
                    <div className="rounded bg-white border p-2">
                      <div className="text-gray-500">Barcode ID</div>
                      <div className="font-mono font-semibold">{piece.imbParsed.barcodeId}</div>
                    </div>
                    <div className="rounded bg-white border p-2">
                      <div className="text-gray-500">Service (STID)</div>
                      <div className="font-mono font-semibold">{piece.imbParsed.serviceType}</div>
                    </div>
                    <div className="rounded bg-white border p-2">
                      <div className="text-gray-500">Mailer ID</div>
                      <div className="font-mono font-semibold">{piece.imbParsed.mailerId}</div>
                    </div>
                    <div className="rounded bg-white border p-2">
                      <div className="text-gray-500">Serial</div>
                      <div className="font-mono font-semibold">{piece.imbParsed.serial}</div>
                    </div>
                    <div className="rounded bg-white border p-2">
                      <div className="text-gray-500">Routing ZIP</div>
                      <div className="font-mono font-semibold">
                        {piece.imbParsed.routingZip || "—"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Campaign context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border bg-white p-3">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Campaign
                  </div>
                  <div className="font-medium">{piece.campaign.name}</div>
                  <div className="text-xs text-gray-500">{piece.campaign.campaignCode}</div>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Customer / Batch
                  </div>
                  <div className="font-medium">{piece.company.name}</div>
                  <div className="text-xs text-gray-500">
                    {piece.mailBatch?.batchName ?? "—"}
                    {piece.mailBatch?.dropDate &&
                      ` • dropped ${new Date(piece.mailBatch.dropDate).toLocaleDateString()}`}
                  </div>
                </div>
              </div>

              {/* Scan timeline */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Scan Timeline ({piece.scanEvents.length} events)
                </div>
                {piece.scanEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No scans yet. USPS will begin reporting after the mail is inducted.
                  </div>
                ) : (
                  <div className="relative">
                    {/* vertical line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                    <div className="space-y-3">
                      {piece.scanEvents.map((ev) => {
                        const Icon = OP_ICONS[ev.operation] ?? Clock;
                        const color = OP_COLORS[ev.operation] ?? "bg-gray-100 text-gray-700 ring-gray-200";
                        return (
                          <div key={ev.id} className="relative pl-11">
                            <div
                              className={`absolute left-0 top-0 h-8 w-8 rounded-full ring-4 ring-white ${color.split(" ").slice(0, 2).join(" ")} flex items-center justify-center`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="rounded-lg border bg-white p-3">
                              <div className="flex items-center justify-between text-sm">
                                <div className="font-semibold text-gray-900">
                                  {ev.operation.replace(/_/g, " ")}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(ev.scanDatetime).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {ev.facilityCity}, {ev.facilityState} {ev.facilityZip}
                                {ev.facilityType && (
                                  <Badge className="ml-2 bg-gray-100 text-gray-600 text-[10px]">
                                    {ev.facilityType}
                                  </Badge>
                                )}
                              </div>
                              {(ev.machineId || ev.operationCode) && (
                                <div className="text-[10px] text-gray-400 font-mono mt-1">
                                  {ev.operationCode && `op ${ev.operationCode}`}
                                  {ev.machineId && ` • ${ev.machineId}`}
                                  {ev.runId && ` • ${ev.runId}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
