/**
 * Compare IMb structure between high-scan customers (Pinellas: 85%) and
 * low-scan customers (Dock Builders: 0%). Are the IMbs themselves structurally
 * different? Or is the issue downstream (USPS subscription, induction, etc.)?
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { parseIMb } from "../src/lib/services/imb";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const targets = [
    "Pinellas Education Foundation", // 85% scan rate
    "MGE", // 18%
    "Morton Plant", // 1%
    "Dock Builders", // 0%
    "Achieva", // 0% (just dropped today — for control)
  ];

  for (const name of targets) {
    const co = await prisma.company.findFirst({ where: { name } });
    if (!co) continue;

    const samples = await prisma.mailPiece.findMany({
      where: { companyId: co.id, status: { not: "EXPIRED_NO_SCAN" } },
      take: 3,
      select: {
        imb: true,
        imbBarcodeId: true,
        imbServiceType: true,
        imbMailerId: true,
        imbSerial: true,
        imbRoutingZip: true,
        zip5: true,
        firstScanAt: true,
      },
    });

    console.log(`\n━━━ ${co.name} ━━━`);
    for (const p of samples) {
      const parsed = parseIMb(p.imb);
      console.log(
        `  imb=${p.imb} (${p.imb.length}d) BC=${p.imbBarcodeId} STID=${p.imbServiceType} MID=${p.imbMailerId} serial=${p.imbSerial} routing=${p.imbRoutingZip ?? "-"} zip=${p.zip5 ?? "-"} firstScan=${p.firstScanAt?.toISOString().slice(0, 10) ?? "(none)"}`,
      );
      console.log(`     parseIMb → ${parsed ? "valid" : "INVALID"}`);
    }

    // Check: any orphan UnknownImbs match this customer's serial range?
    if (samples.length > 0) {
      const sampleSerial = samples[0].imbSerial;
      if (sampleSerial) {
        const serialPrefix = sampleSerial.slice(0, 4);
        const orphanCount = await prisma.unknownImb.count({
          where: { imb: { contains: serialPrefix } },
        });
        console.log(
          `  Orphan IMbs with serial prefix ${serialPrefix}: ${orphanCount}`,
        );
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
