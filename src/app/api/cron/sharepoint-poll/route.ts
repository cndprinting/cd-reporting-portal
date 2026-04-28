/**
 * SharePoint AccuZIP folder poller — runs from Vercel Cron every 10 min.
 *
 * GET /api/cron/sharepoint-poll
 *   - Cron: Authorization: Bearer ${CRON_SECRET}
 *   - Admin manual trigger: any logged-in admin session
 *
 * Walks the MailerCity SharePoint Documents library, processes new AccuZIP
 * Mail.dat files dropped by the prepress team, and imports IMbs to the right
 * customer's portal data.
 */

import { NextRequest, NextResponse } from "next/server";
import { pollSharePoint } from "@/lib/services/sharepoint-watcher";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}`;

  let isAdmin = false;
  if (!isCron) {
    const { getSession } = await import("@/lib/session");
    const session = await getSession();
    isAdmin = !!session && (session.role === "ADMIN" || session.role === "ACCOUNT_MANAGER");
  }

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await pollSharePoint();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[sharepoint-poll] fatal:", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
