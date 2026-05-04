/**
 * Audit what's in SharepointImport — what files Tom dropped, what got imported,
 * what their IMbs look like. Cross-reference against USPS push MIDs.
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const imports = await prisma.sharepointImport.findMany({
    orderBy: { startedAt: "desc" },
    take: 30,
  });
  console.log(`\n▸ Recent SharePoint imports (${imports.length}):`);
  for (const i of imports) {
    console.log(
      `   ${i.startedAt.toISOString().slice(0, 16)}  folder=${i.folderName.padEnd(25)} ` +
      `file=${i.fileName.padEnd(45)} imbs=${i.imbsImported.toString().padStart(6)} ` +
      `skipped=${i.imbsSkipped.toString().padStart(5)} status=${i.status}`,
    );
  }

  // Pull a few recent successful imports and look up the MailPieces created from them
  const recentSuccess = imports.filter((i) => i.status === "COMPLETED" && i.createdOrderId);
  console.log(`\n▸ Sample MailPieces created by 3 most recent imports:`);
  for (const imp of recentSuccess.slice(0, 3)) {
    if (!imp.createdOrderId) continue;
    // Find the order's campaign to get pieces
    const order = await prisma.order.findUnique({
      where: { id: imp.createdOrderId },
      select: { campaignId: true, orderCode: true, company: { select: { name: true } } },
    });
    if (!order) continue;
    const samples = await prisma.mailPiece.findMany({
      where: { campaignId: order.campaignId },
      take: 3,
      select: { imb: true, imbBarcodeId: true, imbServiceType: true, imbMailerId: true },
    });
    console.log(`\n   ${imp.fileName} → ${order.orderCode} (${order.company?.name})`);
    for (const s of samples) {
      console.log(
        `     imb=${s.imb}  BC=${s.imbBarcodeId}  STID=${s.imbServiceType}  MID=${s.imbMailerId}`,
      );
    }
  }

  // Compare: distinct MIDs from SharePoint-imported pieces vs the USPS push MID 901052658
  console.log(`\n▸ Cross-check: does any imported MailPiece have MID 901052658?`);
  const matchCount = await prisma.mailPiece.count({
    where: { imbMailerId: "901052658" },
  });
  console.log(`   MailPieces with MID 901052658: ${matchCount}`);

  // What MIDs do we actually see (3 most common)?
  const midCounts = await prisma.$queryRawUnsafe<{ mid: string; count: bigint }[]>(
    `SELECT "imbMailerId" as mid, COUNT(*)::bigint as count
       FROM "MailPiece"
      GROUP BY "imbMailerId"
      ORDER BY count DESC
      LIMIT 5`,
  );
  console.log(`\n▸ Top 5 MIDs in our DB:`);
  for (const m of midCounts) {
    console.log(`   MID=${m.mid}  count=${Number(m.count).toLocaleString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
