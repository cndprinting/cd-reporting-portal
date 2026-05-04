import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const samples = await prisma.mailPiece.findMany({
    take: 5,
    select: { imb: true, imbMailerId: true, imbSerial: true },
  });
  for (const s of samples) {
    console.log(`imb=${s.imb} (len=${s.imb.length}) MID=${s.imbMailerId} serial=${s.imbSerial}`);
  }

  // Try matching the 14:09 USPS push samples
  const targets = [
    "00271901052658190625", // tracking code only (20 digits) from sample push
    "00271901052658190625" + "33573680167", // + routing = 31
  ];
  for (const t of targets) {
    const found = await prisma.mailPiece.findUnique({ where: { imb: t } });
    console.log(`\nLookup ${t} (len=${t.length}): ${found ? "FOUND!" : "not found"}`);
  }

  // Also try starts-with on MID portion to see if any of our pieces share the MID
  const mid = "901052658";
  const byMid = await prisma.mailPiece.count({ where: { imbMailerId: mid } });
  console.log(`\nMailPieces with MID ${mid}: ${byMid}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
