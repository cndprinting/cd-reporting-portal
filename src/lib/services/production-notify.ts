/**
 * Production handoff email — admin manually sends an order to one or more
 * C&D production team members.
 *
 * Triggered from:
 *   - POST /api/orders/:id/send-to-production (admin clicks "Send to
 *     Production" on the queue page or order detail page)
 *
 * Logs every send to ProductionHandoff for audit trail.
 */

import prisma from "@/lib/prisma";
import { sendEmail } from "./email";

const PORTAL_URL = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";

/**
 * Default recipients — pulled from PRODUCTION_NOTIFY_EMAIL env var. Used
 * to pre-fill the "Send to Production" modal. Admin can override per-send.
 */
export function getDefaultProductionRecipients(): string[] {
  return (process.env.PRODUCTION_NOTIFY_EMAIL ?? "tcamp@cndprinting.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function notifyProduction(
  orderId: string,
  options: { recipients: string[]; notes?: string; sentByUserId: string },
): Promise<{ ok: boolean; error?: string; recipients: string[] }> {
  if (!prisma) return { ok: false, error: "db unavailable", recipients: [] };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      company: { select: { name: true } },
      campaign: { select: { name: true, campaignCode: true } },
    },
  });
  if (!order) return { ok: false, error: "order not found", recipients: [] };

  const recipients = options.recipients.map((r) => r.trim()).filter(Boolean);
  if (recipients.length === 0) {
    return { ok: false, error: "no recipients provided", recipients: [] };
  }

  const dropDate = order.dropDate
    ? new Date(order.dropDate).toLocaleDateString()
    : "Not specified";
  const filename = `${order.orderCode}.zip`;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,sans-serif;color:#0f172a;line-height:1.6;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
<tr><td style="padding:24px 28px;background:#0f172a;color:#fff;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">New AccuZIP Job</div>
<div style="font-size:22px;font-weight:700;margin-top:4px;font-family:monospace;">${order.orderCode}</div>
</td></tr>
<tr><td style="padding:28px;">
<p style="margin:0 0 16px;">Hey Tom — a new order is ready for AccuZIP processing.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
<tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:40%;">Customer</td><td style="font-weight:600;">${order.company.name}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Order code</td><td style="font-weight:600;font-family:monospace;">${order.orderCode}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Campaign</td><td style="font-weight:600;">${order.campaign.name}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Quantity</td><td style="font-weight:600;">${order.quantity.toLocaleString()} pieces</td></tr>
${order.mailShape ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Type</td><td style="font-weight:600;">${order.mailShape}</td></tr>` : ""}
${order.mailClass ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Mail class</td><td style="font-weight:600;">${order.mailClass}</td></tr>` : ""}
<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Target drop date</td><td style="font-weight:600;">${dropDate}</td></tr>
${order.description ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">Notes</td><td>${order.description}</td></tr>` : ""}
</table>

${
  order.mailingListUrl
    ? `<div style="background:#ecfdf5;border:1px solid #86efac;border-radius:8px;padding:14px;margin:16px 0;">
<div style="font-size:12px;color:#065f46;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Recipient list ready</div>
<a href="${order.mailingListUrl}" style="display:inline-block;margin-top:6px;color:#059669;font-weight:600;font-size:14px;">📥 Download ${order.mailingListFileName ?? "list"}</a>
</div>`
    : `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;">
<div style="font-size:12px;color:#92400e;font-weight:600;">⚠️ No recipient list attached yet — wait for customer or admin to upload.</div>
</div>`
}

${
    options.notes
      ? `<div style="background:#fefce8;border-left:4px solid #eab308;padding:14px;margin:20px 0;border-radius:4px;">
<div style="font-size:12px;font-weight:600;color:#713f12;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Note from sender</div>
<div style="font-size:14px;color:#422006;white-space:pre-wrap;">${String(options.notes).slice(0, 1500)}</div>
</div>`
      : ""
  }

<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px;margin:20px 0;border-radius:4px;">
<div style="font-size:13px;font-weight:600;color:#1e40af;margin-bottom:6px;">📋 When you're done with AccuZIP:</div>
<div style="font-size:13px;color:#1e3a8a;line-height:1.7;">
1. Zip the Presort folder<br/>
2. Name the zip: <code style="background:#dbeafe;padding:2px 6px;border-radius:3px;font-size:12px;">${filename}</code><br/>
3. Drop into SharePoint → <code style="background:#dbeafe;padding:2px 6px;border-radius:3px;font-size:12px;">Marketing Portal Operations</code> → <code style="background:#dbeafe;padding:2px 6px;border-radius:3px;font-size:12px;">${order.company.name}</code> folder
</div>
<div style="font-size:11px;color:#3b82f6;margin-top:8px;">The portal will auto-import within 24 hrs (or admin can trigger sooner). The filename is critical — it's how we attach IMbs to the right order.</div>
</div>

<p style="margin:24px 0 0;text-align:center;">
<a href="${PORTAL_URL}/dashboard/orders/${order.id}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View order details →</a>
</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;">
C&amp;D Marketing Portal · ${order.orderCode} · ${new Date().toLocaleDateString()}
</td></tr>
</table>
</td></tr></table></body></html>`;

  const send = await sendEmail({
    to: recipients,
    subject: `🖨 New AccuZIP job — ${order.orderCode} (${order.company.name})`,
    html,
  });

  if (send.ok) {
    // Log the handoff for audit + dashboard visibility
    await prisma.productionHandoff.create({
      data: {
        orderId,
        recipients: recipients.join(", "),
        notes: options.notes ?? null,
        sentByUserId: options.sentByUserId,
      },
    });
    // Mirror on the order for fast filtering
    await prisma.order.update({
      where: { id: orderId },
      data: { productionNotifiedAt: new Date() },
    });
    return { ok: true, recipients };
  }

  return { ok: false, error: send.error, recipients };
}
