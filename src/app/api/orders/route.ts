/**
 * Order list + create endpoints.
 *
 * GET  /api/orders            — list (admin: all; customer: own company only)
 * POST /api/orders            — create (admin/rep only)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateOrderCode } from "@/lib/services/order-codes";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ orders: [] });

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") || undefined;
  const companyFilter = url.searchParams.get("companyId") || undefined;
  const includeArchived = url.searchParams.get("includeArchived") === "true";

  const where: Record<string, unknown> = {};
  // Customers only see their own company's orders
  if (session.role === "CUSTOMER") {
    where.companyId = session.companyId;
  } else if (companyFilter) {
    where.companyId = companyFilter;
  } else if (!includeArchived) {
    // Admins by default DON'T see orders for archived companies — they're noise.
    // Pass ?includeArchived=true to surface them (e.g. for cleanup).
    where.company = { isActive: true };
  }
  if (statusFilter) where.status = statusFilter;

  const orders = await prisma.order.findMany({
    where,
    include: {
      company: { select: { id: true, name: true, logoUrl: true } },
      campaign: { select: { id: true, name: true, campaignCode: true } },
      proof: { select: { pdfUrl: true, uploadedAt: true } },
      approval: { select: { approvedAt: true, approvedByName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const body = await req.json();
  const {
    companyId: rawCompanyId,
    campaignId,
    description,
    quantity,
    dropDate,
    mailClass,
    mailShape,
    pricePerPiece,
    setupFee,
    totalPrice,
    customFields,
  } = body;

  // Customers can only create orders for their own company
  let companyId = rawCompanyId;
  if (session.role === "CUSTOMER") {
    companyId = session.companyId;
  } else if (!companyId) {
    return NextResponse.json({ error: "companyId required for admin-created orders" }, { status: 400 });
  }

  if (!campaignId || !quantity) {
    return NextResponse.json(
      { error: "campaignId and quantity are required" },
      { status: 400 },
    );
  }

  // Custom-quote orders skip pricing entirely
  const isCustomQuote = body.isCustomQuote === true;
  const initialStatus = isCustomQuote ? "QUOTE_REQUESTED" : "DRAFT";

  const orderCode = await generateOrderCode(companyId);
  const order = await prisma.order.create({
    data: {
      orderCode,
      companyId,
      campaignId,
      description,
      quantity,
      dropDate: dropDate ? new Date(dropDate) : null,
      mailClass,
      mailShape,
      pricePerPiece: isCustomQuote ? null : pricePerPiece,
      setupFee: isCustomQuote ? null : setupFee,
      totalPrice: isCustomQuote
        ? null
        : (totalPrice ?? (pricePerPiece && quantity ? pricePerPiece * quantity : null)),
      createdBy: session.id,
      status: initialStatus,
      // Custom quote-specific fields
      isCustomQuote,
      customQuoteRequest: body.customQuoteRequest ?? null,
      customQuoteUrgency: body.customQuoteUrgency ?? null,
      customQuoteTargetDate: body.customQuoteTargetDate
        ? new Date(body.customQuoteTargetDate)
        : null,
      // Persona-module data (e.g. land-investor offer rules + recipient filters)
      customFields: customFields ?? undefined,
      // Customer-supplied design PDF (when picked the "Use my own design" tile)
      customDesignUrl: body.customDesignUrl ?? null,
      customDesignFileName: body.customDesignFileName ?? null,
      customDesignUploadedAt: body.customDesignUrl ? new Date() : null,
      // Prepaid package draw-down — when set, charge today is $0; package
      // balance is decremented + audit row written below.
      packageId: body.packageId ?? null,
      // Optional QR code destination URL — production embeds in merged PDFs
      qrDestinationUrl: body.qrDestinationUrl ?? null,
    },
    include: {
      company: { select: { name: true, users: { select: { email: true } } } },
      campaign: { select: { name: true, campaignCode: true } },
    },
  });

  // Prepaid package draw-down — decrement balance + write audit row
  if (body.packageId && quantity) {
    try {
      const pkg = await prisma.mailPackage.findUnique({
        where: { id: body.packageId },
      });
      if (pkg && pkg.companyId === companyId && pkg.status === "ACTIVE") {
        const remaining = pkg.totalPieces - pkg.usedPieces;
        if (remaining >= quantity) {
          await prisma.$transaction([
            prisma.mailPackage.update({
              where: { id: pkg.id },
              data: {
                usedPieces: { increment: quantity },
                // Auto-flip to EXHAUSTED when balance hits zero
                status:
                  pkg.usedPieces + quantity >= pkg.totalPieces ? "EXHAUSTED" : "ACTIVE",
              },
            }),
            prisma.packageDrawdown.create({
              data: {
                packageId: pkg.id,
                orderId: order.id,
                pieces: quantity,
                note: `Order ${order.orderCode}`,
              },
            }),
          ]);
        }
      }
    } catch (e) {
      console.error("[orders] package drawdown failed", e);
    }
  }

  // Notify CSR on EVERY new order (DRAFT) — they need to create a job
  // ticket in C&D's existing offline process, then key the ticket # back
  // into MailerCity to trigger the production handoff email to Tom.
  // Skipped for custom-quote requests (those go to admin/sales for pricing
  // first; CSR notification fires later when quote is accepted).
  if (!isCustomQuote) {
    try {
      const { sendEmail } = await import("@/lib/services/email");
      const portalUrl = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
      const csrEmails = (process.env.CSR_NOTIFY_EMAIL ?? "kjacobsen@cndprinting.com")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await sendEmail({
        to: csrEmails,
        subject: `📋 New order from ${order.company.name} — create job ticket`,
        html: `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#1A1814;line-height:1.6;padding:24px;background:#FAF7F2;">
<table cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #E8E0D2;border-radius:8px;overflow:hidden;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #E8E0D2;">
<div style="font-family:Georgia,serif;font-size:18px;font-weight:500;">C&amp;D <span style="color:#B85C3D;font-style:italic;">MailerCity</span></div>
</td></tr>
<tr><td style="padding:24px 32px;">
<h2 style="margin:0 0 14px;font-size:18px;">New order — please create a job ticket</h2>
<p style="margin:0 0 14px;"><strong>${order.company.name}</strong> just submitted an order. Create the job ticket the usual way, then enter the ticket # in MailerCity to send it to Tom for AccuZIP.</p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin:14px 0;">
  <tr><td style="color:#6B6660;padding-right:14px;">Order #</td><td><strong><code>${order.orderCode}</code></strong></td></tr>
  <tr><td style="color:#6B6660;">Customer</td><td>${order.company.name}</td></tr>
  <tr><td style="color:#6B6660;">Quantity</td><td>${order.quantity?.toLocaleString() ?? "—"}</td></tr>
  ${order.mailShape ? `<tr><td style="color:#6B6660;">Format</td><td>${order.mailShape}${order.mailClass ? ` · ${order.mailClass}` : ""}</td></tr>` : ""}
  ${order.dropDate ? `<tr><td style="color:#6B6660;">Drop date</td><td>${new Date(order.dropDate).toLocaleDateString()}</td></tr>` : ""}
  ${order.totalPrice != null ? `<tr><td style="color:#6B6660;">Estimated total</td><td>$${order.totalPrice.toFixed(2)} (final price reconciled after AccuZIP)</td></tr>` : ""}
  ${order.description ? `<tr><td style="color:#6B6660;">Description</td><td>${order.description}</td></tr>` : ""}
</table>
<p style="margin:20px 0 8px;">
<a href="${portalUrl}/dashboard/orders/${order.id}" style="display:inline-block;background:#B85C3D;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Open order in MailerCity →</a>
</p>
<p style="font-size:12px;color:#6B6660;margin-top:18px;">When you've created the paper job ticket, open the order above, type the ticket # into the &ldquo;Production Handoff&rdquo; panel, and click <em>Send to Production</em>. That emails Tom with everything he needs to AccuZIP the file.</p>
</td></tr>
<tr><td style="padding:14px 32px;background:#FAF7F2;color:#6B6660;font-size:11px;border-top:1px solid #E8E0D2;text-align:center;">marketing.cndprinting.com &middot; C&amp;D Printing</td></tr>
</table>
</body></html>`,
      });
    } catch (e) {
      console.error("[orders] CSR notify failed", e);
    }
  }

  // Notify admins on quote requests (Resend, branded)
  if (isCustomQuote) {
    try {
      const { sendEmail } = await import("@/lib/services/email");
      const portalUrl = process.env.PORTAL_URL ?? "https://marketing.cndprinting.com";
      const adminEmails = (process.env.SALES_NOTIFY_EMAIL ?? "bwaxman@cndprinting.com")
        .split(",").map(s => s.trim()).filter(Boolean);
      await sendEmail({
        to: adminEmails,
        subject: `🎯 Custom quote requested — ${order.company.name}`,
        html: `<!doctype html><html><body style="font-family:-apple-system,sans-serif;font-size:14px;color:#0f172a;line-height:1.6;padding:24px;">
<h2 style="margin:0 0 12px">Custom quote requested</h2>
<p><strong>${order.company.name}</strong> just requested a custom price. Order: <code>${order.orderCode}</code></p>
<p style="margin-top:16px;"><strong>Their request:</strong></p>
<blockquote style="margin:8px 0;padding:12px;background:#f5f3ff;border-left:3px solid #8b5cf6;border-radius:4px;white-space:pre-wrap;font-size:13px;">${(body.customQuoteRequest ?? "(no description)").slice(0, 2000)}</blockquote>
<p>Urgency: <strong>${body.customQuoteUrgency ?? "standard"}</strong></p>
${body.dropDate ? `<p>Target drop date: <strong>${body.dropDate}</strong></p>` : ""}
${body.quantity ? `<p>Approximate quantity: <strong>${body.quantity.toLocaleString()}</strong></p>` : ""}
<p style="margin-top:20px;"><a href="${portalUrl}/dashboard/orders/${order.id}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Review &amp; price this →</a></p>
<hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0;" />
<p style="font-size:12px;color:#64748b;">Forward this to Mary if she handles estimating; she'll send you the price to enter into the portal.</p>
</body></html>`,
      });
    } catch {
      /* don't fail the order create if email fails */
    }
  }

  return NextResponse.json(order, { status: 201 });
}
