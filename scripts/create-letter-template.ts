/**
 * Create a real Letter (8.5x11) template in the DB at $0.65/piece
 * ($0.22 production + $0.43 First-Class postage). This is a real C&D rate,
 * not a seed value, so it survives DB resets and shows up alongside the
 * postcard templates Aaron will see.
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const HTML = `<div style="width:100%;height:100%;background:#fff;color:#0f172a;padding:32px;font-family:Georgia,serif;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:6px;">
  <div>
    <div style="font-size:11px;letter-spacing:0.1em;color:#64748b;text-transform:uppercase;">{{companyName}}</div>
    <div style="font-size:22px;font-weight:600;line-height:1.3;margin-top:14px;">Dear {{firstName}},</div>
    <div style="font-size:14px;color:#334155;margin-top:14px;line-height:1.6;">
      We&rsquo;re reaching out personally about your property at <strong>{{address1}}</strong>.
      {{offer}}
    </div>
  </div>
  <div style="font-size:13px;color:#475569;line-height:1.5;">
    Sincerely,<br/>
    <strong>{{companyName}}</strong>
  </div>
</div>`;

async function main() {
  const existing = await prisma.mailerTemplate.findFirst({
    where: { category: "letter", size: "8.5x11" },
  });
  if (existing) {
    await prisma.mailerTemplate.update({
      where: { id: existing.id },
      data: { pricePerPiece: 0.65 },
    });
    console.log(`✓ Updated existing letter template ${existing.name} to $0.65`);
    return;
  }
  const tpl = await prisma.mailerTemplate.create({
    data: {
      name: "Letter — Personalized Outreach (8.5×11)",
      category: "letter",
      size: "8.5x11",
      htmlTemplate: HTML,
      variables: "firstName,address1,city,state,zip5,offer,companyName",
      pricePerPiece: 0.65,
      minQuantity: 250,
      isActive: true,
    },
  });
  console.log(`✓ Created letter template (id=${tpl.id}) at $0.65/piece`);
  console.log(`   $0.22 production + $0.43 postage = $0.65 customer price`);
}

main()
  .catch((e) => {
    console.error("✗ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
