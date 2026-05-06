/**
 * Manually send a single order to production. Admin-only.
 *
 * POST /api/orders/:id/send-to-production
 *   body: { recipients: string[], notes?: string }
 *
 * Fires the branded production handoff email to the chosen recipients and
 * logs a ProductionHandoff row for audit.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  notifyProduction,
  getDefaultProductionRecipients,
} from "@/lib/services/production-notify";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  // Default to PRODUCTION_NOTIFY_EMAIL env if caller didn't override —
  // the typical CSR flow only passes the ticket # + notes.
  const recipients: string[] =
    Array.isArray(body.recipients) && body.recipients.length > 0
      ? body.recipients
      : getDefaultProductionRecipients();
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "no recipients (PRODUCTION_NOTIFY_EMAIL env not set?)" },
      { status: 400 },
    );
  }

  const result = await notifyProduction(id, {
    recipients,
    notes: body.notes,
    jobTicketNumber: body.jobTicketNumber,
    sentByUserId: session.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "send failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, recipients: result.recipients });
}
