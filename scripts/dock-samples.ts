import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const co = await p.company.findFirst({ where: { name: "Dock Builders" } });
  if (!co) return;
  const pieces = await p.mailPiece.findMany({
    where: { companyId: co.id },
    take: 8,
    orderBy: { createdAt: "asc" },
  });
  console.log("\nDock Builders sample IMbs:");
  for (const piece of pieces) {
    console.log(`  imb=${piece.imb} (len=${piece.imb.length})  BC=${piece.imbBarcodeId} STID=${piece.imbServiceType} MID=${piece.imbMailerId} serial=${piece.imbSerial}`);
  }
  // What was originally stored before backfill? we can't know — but try
  // shifting back to see if a correct interpretation exists
  const sample = pieces[0];
  console.log(`\nReinterpreting first sample ${sample.imb}:`);
  // What if BC should be 00 and the leading 2 is actually serial digit?
  // Or what if backfill should have stripped 0 from front, 2 from back?
  for (let lead = 0; lead <= 2; lead++) {
    for (let trail = 0; trail <= 2; trail++) {
      const tried = "0027190105265819" + sample.imb.slice(16 + trail, sample.imb.length - lead);
      console.log(`  prepend canonical 00271+MID+ try slice from ${16 + trail} skip-trail ${lead}: ${tried}`);
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
