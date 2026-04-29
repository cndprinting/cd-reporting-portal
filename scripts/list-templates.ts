import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const all = await prisma.mailerTemplate.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`\nTotal templates in DB: ${all.length}\n`);
  for (const t of all) {
    console.log(`  ${t.isActive ? "✓" : "🗄"} ${t.name}`);
    console.log(`     id=${t.id}  category=${t.category}  size=${t.size}  $${t.pricePerPiece}/pc  min=${t.minQuantity}`);
  }
}
main().finally(() => prisma.$disconnect());
