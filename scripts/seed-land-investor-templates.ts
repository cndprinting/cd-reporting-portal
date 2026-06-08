/**
 * Seed land-investor mail templates.
 *
 * Six angles based on well-known motivated-seller patterns:
 *   LND-PC-001  Cash for vacant land (workhorse)
 *   LND-PC-002  No fees / no commissions
 *   LND-PC-003  Personalized "Owners of [APN]"
 *   LND-PC-004  Aerial view of your land (Google-style)
 *   LND-LT-001  Yellow-letter handwritten
 *   LND-LT-002  Probate / inherited land
 *
 * Copy will be refined when Aaron's Rocket Prints samples arrive — these are
 * placeholders styled to look reasonable in the gallery preview before a
 * designer renders real artwork.
 *
 * Idempotent: upserts on `shortCode`.
 */
import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Seed = {
  shortCode: string;
  name: string;
  category: "postcard" | "letter";
  size: string;
  subcategory: string;
  offerHook: string;
  description: string;
  variables: string;
  pricePerPiece: number;
  postageIncluded: boolean;
  minQuantity: number;
  featured: boolean;
  displayOrder: number;
  htmlTemplate: string;
  backHtmlTemplate?: string;
};

const VAR_LAND = "firstName,lastName,address1,city,state,zip5,parcelApn,acreage,offerLow,offerHigh,senderName,senderPhone";

const SEEDS: Seed[] = [
  {
    shortCode: "LND-PC-001",
    name: "Cash For Your Vacant Land — Classic",
    category: "postcard",
    size: "6x9",
    subcategory: "motivated-seller",
    offerHook: "Cash for vacant land",
    description: "Workhorse postcard for cold land lists. Direct cash offer, fast close, no fees. Highest-volume template for new land investors.",
    variables: VAR_LAND,
    pricePerPiece: 0.67,
    postageIncluded: true,
    minQuantity: 500,
    featured: true,
    displayOrder: 10,
    htmlTemplate: `<div style="width:100%;height:100%;background:linear-gradient(135deg,#0f766e,#0e7c5a);color:#fff;padding:36px;font-family:-apple-system,Segoe UI,sans-serif;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
  <div>
    <div style="font-size:12px;letter-spacing:2px;opacity:.75;text-transform:uppercase;">{{senderName}}</div>
    <div style="font-size:34px;font-weight:800;line-height:1.05;margin-top:18px;">We pay cash for your land in {{city}}, {{state}}.</div>
  </div>
  <div style="font-size:15px;line-height:1.5;">
    Hi {{firstName}} — we noticed you own {{acreage}} acres at parcel #{{parcelApn}}. We'd like to make a fair, no-obligation cash offer between <b>\${{offerLow}}</b> and <b>\${{offerHigh}}</b>. No realtor fees. No closing costs. We close in 14 days.
  </div>
  <div style="font-size:14px;font-weight:600;">Call {{senderPhone}} for your offer.</div>
</div>`,
  },
  {
    shortCode: "LND-PC-002",
    name: "No Fees, No Commissions",
    category: "postcard",
    size: "6x9",
    subcategory: "fee-savings",
    offerHook: "Skip the realtor — keep the proceeds",
    description: "Fee-savings hook. Resonates with owners holding inherited or forgotten land who don't want to deal with agents.",
    variables: VAR_LAND,
    pricePerPiece: 0.67,
    postageIncluded: true,
    minQuantity: 500,
    featured: false,
    displayOrder: 20,
    htmlTemplate: `<div style="width:100%;height:100%;background:#fdf6e3;color:#1a1a1a;padding:36px;font-family:Georgia,serif;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;border:8px solid #b8860b;">
  <div>
    <div style="font-size:36px;font-weight:700;line-height:1.05;color:#0f4c3a;">Stop paying agents 6%.</div>
    <div style="font-size:18px;margin-top:14px;line-height:1.4;">Sell your {{acreage}} acres in {{city}} directly to us — keep every dollar.</div>
  </div>
  <div style="font-size:14px;line-height:1.5;">
    {{firstName}}, we buy land directly from owners. No realtor commission. No closing costs. No surprise fees. Cash in your account in 14 days.
  </div>
  <div style="font-size:14px;font-weight:600;color:#0f4c3a;">Get a free offer — {{senderPhone}}</div>
</div>`,
  },
  {
    shortCode: "LND-PC-003",
    name: "Owners of Parcel #{{parcelApn}}",
    category: "postcard",
    size: "6x9",
    subcategory: "personalized-apn",
    offerHook: "Hyper-personalized · parcel + acreage on the card",
    description: "Variable-data heavy. Pulls APN, acreage, and offer range from the recipient's row — feels like a 1:1 letter, not a mass mailer.",
    variables: VAR_LAND,
    pricePerPiece: 0.69,
    postageIncluded: true,
    minQuantity: 500,
    featured: true,
    displayOrder: 15,
    htmlTemplate: `<div style="width:100%;height:100%;background:#ffffff;color:#111;padding:36px;font-family:-apple-system,Segoe UI,sans-serif;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;border:2px solid #0f766e;">
  <div>
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0f766e;">Owners of parcel #{{parcelApn}}</div>
    <div style="font-size:32px;font-weight:800;line-height:1.05;margin-top:10px;">Your {{acreage}} acres in {{city}}, {{state}}.</div>
  </div>
  <div style="font-size:15px;line-height:1.5;">
    {{firstName}} — We've researched your specific parcel and would like to make a cash offer between <b>\${{offerLow}}</b> and <b>\${{offerHigh}}</b>. No obligation. No fees. 14-day close.
  </div>
  <div style="font-size:14px;font-weight:600;">Reply or call {{senderPhone}}.</div>
</div>`,
  },
  {
    shortCode: "LND-PC-004",
    name: "Aerial View — Your Land",
    category: "postcard",
    size: "6x9",
    subcategory: "aerial-view",
    offerHook: "Satellite image of the recipient's actual parcel",
    description: "Premium template with a Google-aerial image of the owner's specific land. Differentiator — converts at much higher rates than generic mailers. Requires aerial-image add-on at print time.",
    variables: VAR_LAND,
    pricePerPiece: 0.89,
    postageIncluded: true,
    minQuantity: 250,
    featured: true,
    displayOrder: 5,
    htmlTemplate: `<div style="width:100%;height:100%;background:#1f2937;color:#fff;padding:0;font-family:-apple-system,Segoe UI,sans-serif;display:flex;box-sizing:border-box;">
  <div style="flex:1.1;background:linear-gradient(135deg,#3a5f4a,#6b8e6f);position:relative;display:flex;align-items:center;justify-content:center;">
    <div style="font-size:11px;color:#fff8;letter-spacing:2px;">[ AERIAL · {{parcelApn}} ]</div>
  </div>
  <div style="flex:1;padding:30px;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="font-size:11px;letter-spacing:2px;opacity:.7;text-transform:uppercase;">Your land · {{acreage}} acres</div>
      <div style="font-size:26px;font-weight:800;margin-top:10px;line-height:1.1;">We'd like to buy this.</div>
    </div>
    <div style="font-size:13px;line-height:1.5;">{{firstName}}, cash offer between <b>\${{offerLow}}</b> and <b>\${{offerHigh}}</b>. 14-day close.</div>
    <div style="font-size:13px;font-weight:600;">{{senderPhone}}</div>
  </div>
</div>`,
  },
  {
    shortCode: "LND-LT-001",
    name: "Yellow Letter — Handwritten",
    category: "letter",
    size: "8.5x11",
    subcategory: "yellow-letter",
    offerHook: "Looks handwritten · opens at 90%+",
    description: "The legendary yellow-letter format. Personal-feeling handwritten note in a hand-addressed envelope. Opens at 90%+ vs ~30% for postcards.",
    variables: VAR_LAND,
    pricePerPiece: 0.99,
    postageIncluded: true,
    minQuantity: 250,
    featured: true,
    displayOrder: 30,
    htmlTemplate: `<div style="width:100%;height:100%;background:#fffbe6;padding:48px;font-family:'Caveat','Comic Sans MS',cursive;color:#1a1a1a;box-sizing:border-box;line-height:1.7;font-size:20px;">
  <div>Hi {{firstName}},</div>
  <div style="margin-top:18px;">My name is {{senderName}}. I'd like to buy your {{acreage}} acres of land in {{city}}, {{state}} (parcel #{{parcelApn}}).</div>
  <div style="margin-top:14px;">I can pay cash — between \${{offerLow}} and \${{offerHigh}}. No realtor fees. Close in 14 days. I handle all the paperwork.</div>
  <div style="margin-top:14px;">If you'd consider selling, call or text me at {{senderPhone}}.</div>
  <div style="margin-top:24px;">Thanks,</div>
  <div style="margin-top:4px;">{{senderName}}</div>
</div>`,
  },
  {
    shortCode: "LND-LT-002",
    name: "Inherited / Probate Land",
    category: "letter",
    size: "8.5x11",
    subcategory: "probate",
    offerHook: "For owners who inherited land they don't want",
    description: "Targeted at probate / inherited-land lists. Sympathetic tone, focuses on freeing the recipient from carrying costs (taxes, weeds, liability) on land they never wanted.",
    variables: VAR_LAND,
    pricePerPiece: 0.95,
    postageIncluded: true,
    minQuantity: 250,
    featured: false,
    displayOrder: 40,
    htmlTemplate: `<div style="width:100%;height:100%;background:#ffffff;padding:48px;font-family:Georgia,serif;color:#1a1a1a;box-sizing:border-box;line-height:1.6;font-size:15px;">
  <div style="font-size:13px;color:#666;">{{senderName}}</div>
  <div style="margin-top:24px;">Dear {{firstName}},</div>
  <div style="margin-top:14px;">If you've recently inherited the {{acreage}}-acre parcel at #{{parcelApn}} in {{city}}, {{state}} — and you've been wondering what to do with it — this letter is for you.</div>
  <div style="margin-top:14px;">Inherited land often comes with property taxes, weed-abatement notices, and liability you didn't ask for. We pay cash for parcels like yours so you can put it behind you.</div>
  <div style="margin-top:14px;">A fair, no-obligation cash offer for your parcel: between <b>\${{offerLow}}</b> and <b>\${{offerHigh}}</b>. No realtor. No closing costs. We close in 14 days.</div>
  <div style="margin-top:14px;">If that's something you'd consider, call or text me at {{senderPhone}}.</div>
  <div style="margin-top:24px;">Warmly,</div>
  <div style="margin-top:4px;font-weight:600;">{{senderName}}</div>
</div>`,
  },
];

(async () => {
  for (const s of SEEDS) {
    await prisma.mailerTemplate.upsert({
      where: { shortCode: s.shortCode },
      update: {
        name: s.name,
        category: s.category,
        size: s.size,
        industry: "land-investors",
        subcategory: s.subcategory,
        offerHook: s.offerHook,
        description: s.description,
        variables: s.variables,
        pricePerPiece: s.pricePerPiece,
        postageIncluded: s.postageIncluded,
        minQuantity: s.minQuantity,
        featured: s.featured,
        displayOrder: s.displayOrder,
        htmlTemplate: s.htmlTemplate,
        backHtmlTemplate: s.backHtmlTemplate,
        isActive: true,
      },
      create: {
        shortCode: s.shortCode,
        name: s.name,
        category: s.category,
        size: s.size,
        industry: "land-investors",
        subcategory: s.subcategory,
        offerHook: s.offerHook,
        description: s.description,
        variables: s.variables,
        pricePerPiece: s.pricePerPiece,
        postageIncluded: s.postageIncluded,
        minQuantity: s.minQuantity,
        featured: s.featured,
        displayOrder: s.displayOrder,
        htmlTemplate: s.htmlTemplate,
        backHtmlTemplate: s.backHtmlTemplate,
        isActive: true,
      },
    });
    console.log(`✓ upserted ${s.shortCode} — ${s.name}`);
  }
  console.log(`\nDone. ${SEEDS.length} land-investor templates seeded.`);
})().catch(console.error).finally(() => prisma.$disconnect());
