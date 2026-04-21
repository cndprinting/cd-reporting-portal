/**
 * MailerTemplate CRUD.
 * GET  /api/templates                  — list (public to any logged-in user)
 * POST /api/templates                  — create (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  if (!prisma) return NextResponse.json({ templates: SEED_TEMPLATES });
  const templates = await prisma.mailerTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  // If DB empty, fall back to seed templates so customers can still test the flow
  if (templates.length === 0) {
    return NextResponse.json({ templates: SEED_TEMPLATES });
  }
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!prisma) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const body = await req.json();
  const {
    name,
    category,
    size,
    thumbnailUrl,
    htmlTemplate,
    variables,
    pricePerPiece,
    minQuantity,
  } = body;
  if (!name || !htmlTemplate)
    return NextResponse.json({ error: "name and htmlTemplate required" }, { status: 400 });

  const tpl = await prisma.mailerTemplate.create({
    data: {
      name,
      category: category ?? "postcard",
      size: size ?? "6x9",
      thumbnailUrl,
      htmlTemplate,
      variables: variables ?? "firstName,address1,city,state,zip5,offer",
      pricePerPiece: pricePerPiece ?? 0.85,
      minQuantity: minQuantity ?? 500,
    },
  });
  return NextResponse.json(tpl, { status: 201 });
}

// Built-in seed templates so the flow works out of the box without admins
// having to set up the template library first.
const SEED_TEMPLATES = [
  {
    id: "seed-real-estate-1",
    name: "Real Estate — Cash Offer",
    category: "postcard",
    size: "6x9",
    thumbnailUrl: null,
    variables: "firstName,address1,city,state,zip5,offer",
    pricePerPiece: 0.85,
    minQuantity: 500,
    htmlTemplate: `<div style="width:100%;height:100%;background:#0ea5e9;color:#fff;padding:32px;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;border-radius:12px;">
  <div>
    <div style="font-size:11px;letter-spacing:0.15em;opacity:0.7;text-transform:uppercase;">Cash Offer Today</div>
    <div style="font-size:32px;font-weight:800;line-height:1.1;margin-top:8px;">Hi {{firstName}} —<br/>we want to buy your home</div>
  </div>
  <div>
    <div style="font-size:13px;opacity:0.85;line-height:1.5;">
      We&rsquo;re paying fair-market value for homes at <strong>{{address1}}</strong> and nearby in {{city}}, {{state}}.
    </div>
    <div style="margin-top:14px;background:#fff;color:#0ea5e9;display:inline-block;padding:8px 14px;border-radius:8px;font-weight:700;font-size:13px;">
      {{offer}}
    </div>
  </div>
</div>`,
    isActive: true,
  },
  {
    id: "seed-dentist-1",
    name: "Dental — New Patient Offer",
    category: "postcard",
    size: "6x9",
    thumbnailUrl: null,
    variables: "firstName,address1,city,state,zip5,offer",
    pricePerPiece: 0.78,
    minQuantity: 500,
    htmlTemplate: `<div style="width:100%;height:100%;background:#fff;color:#111;padding:32px;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;border:2px solid #10b981;border-radius:12px;">
  <div>
    <div style="color:#10b981;font-size:11px;letter-spacing:0.15em;font-weight:600;text-transform:uppercase;">New Patient Special</div>
    <div style="font-size:30px;font-weight:800;line-height:1.15;margin-top:8px;">Welcome, {{firstName}}</div>
    <div style="font-size:16px;color:#374151;margin-top:10px;line-height:1.5;">
      A brighter smile is 10 minutes away. {{offer}}
    </div>
  </div>
  <div style="font-size:12px;color:#6b7280;">
    Open weekdays 8&ndash;6, Saturdays 9&ndash;1.<br/>
    Mailed to {{address1}}, {{city}}.
  </div>
</div>`,
    isActive: true,
  },
  {
    id: "seed-restaurant-1",
    name: "Restaurant — Grand Opening",
    category: "postcard",
    size: "4x6",
    thumbnailUrl: null,
    variables: "firstName,address1,city,state,zip5,offer",
    pricePerPiece: 0.62,
    minQuantity: 1000,
    htmlTemplate: `<div style="width:100%;height:100%;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;padding:28px;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;border-radius:12px;">
  <div>
    <div style="font-size:10px;letter-spacing:0.18em;opacity:0.9;text-transform:uppercase;">Grand Opening</div>
    <div style="font-size:36px;font-weight:900;line-height:1;margin-top:6px;">Come eat with us, {{firstName}}!</div>
  </div>
  <div style="font-size:14px;font-weight:600;background:rgba(0,0,0,0.2);padding:10px 14px;border-radius:8px;">{{offer}}</div>
</div>`,
    isActive: true,
  },
];
