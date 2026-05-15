/**
 * Check Aaron's BH Land Group order state — any imported MailPieces from
 * the bad upload that need to be cleared before Tom re-uploads.
 */
import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const COMMIT = process.argv.includes("--commit");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const co = await prisma.company.findFirst({ where: { name: "BH Land Group" } });
  if (!co) {
    console.log("BH Land Group not found");
    return;
  }
  const orders = await prisma.order.findMany({
    where: { companyId: co.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, orderCode: true, status: true, createdAt: true, quantity: true },
  });
  console.log(`\nRecent BH Land Group orders:`);
  for (const o of orders) {
    const pieceCount = await prisma.mailPiece.count({ where: { campaignId: o.id } });
    console.log(`  ${o.orderCode}  status=${o.status}  qty=${o.quantity}  pieces in DB=${pieceCount}  ${o.createdAt.toISOString().slice(0, 10)}`);
  }

  const allPieces = await prisma.mailPiece.count({ where: { companyId: co.id } });
  console.log(`\nTotal MailPieces stored for BH Land Group: ${allPieces}`);

  // SharePoint imports for BH Land
  const imports = await prisma.sharepointImport.findMany({
    where: { matchedCompanyId: co.id },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: {
      id: true,
      fileName: true,
      status: true,
      imbsImported: true,
      errorMessage: true,
      startedAt: true,
    },
  });
  console.log(`\nSharePoint imports for BH Land Group: ${imports.length}`);
  for (const i of imports) {
    console.log(`  ${i.startedAt.toISOString().slice(0, 16)}  ${i.fileName}  status=${i.status}  imbs=${i.imbsImported}`);
    if (i.errorMessage) console.log(`     errorMessage: ${i.errorMessage.slice(0, 200)}`);
  }

  if (COMMIT && allPieces > 0) {
    const r = await prisma.mailPiece.deleteMany({ where: { companyId: co.id } });
    console.log(`\n✅ Deleted ${r.count} MailPiece records for BH Land Group.`);
    console.log(`   Tom can upload the corrected .pbc cleanly now.`);
  } else if (allPieces > 0) {
    console.log(`\nRun with --commit to delete all ${allPieces} BH Land Group MailPieces.`);
  } else {
    console.log(`\nNo MailPieces to clean up — DB is already clean for BH Land Group.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
