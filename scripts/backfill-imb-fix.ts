/**
 * Backfill: re-parse every stored MailPiece's IMb through extractCleanIMb()
 * to correct the off-by-one slice garbage from the .pbc parser bug.
 *
 * For each piece:
 *   - Run the stored 31-digit IMb through extractCleanIMb()
 *   - If it returns a different (valid) IMb, update the row
 *   - Re-derive imbBarcodeId / imbServiceType / imbMailerId / imbSerial / imbRoutingZip
 *
 * Idempotent: pieces already cleanly parsed are left alone.
 *
 *   npx tsx scripts/backfill-imb-fix.ts            (dry-run; reports counts only)
 *   npx tsx scripts/backfill-imb-fix.ts --commit   (apply updates)
 */

import { config } from "dotenv";
config();
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { parseIMb } from "../src/lib/services/imb";

const COMMIT = process.argv.includes("--commit");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`\n${COMMIT ? "🔧 COMMITTING" : "🔍 DRY-RUN"} backfill\n`);

  const total = await prisma.mailPiece.count();
  console.log(`Total MailPieces: ${total.toLocaleString()}`);

  let alreadyClean = 0;
  let corrected = 0;
  let unrecoverable = 0;
  let collisions = 0;
  const collisionSamples: string[] = [];
  const correctionSamples: { from: string; to: string }[] = [];

  // Process in batches of 1000 to keep memory bounded
  const PAGE = 1000;
  let cursor: string | null = null;
  let processed = 0;

  while (true) {
    const batch: { id: string; imb: string }[] = await prisma.mailPiece.findMany({
      where: cursor ? { id: { gt: cursor } } : {},
      orderBy: { id: "asc" },
      take: PAGE,
      select: { id: true, imb: true },
    });
    if (batch.length === 0) break;

    for (const piece of batch) {
      // Bug pattern is specifically: 31-digit stored IMb where the actual
      // IMb is the 29-digit middle (strip 1 from each side). Test that
      // first; if the 29-digit form parses cleanly with C&D's known MID
      // pattern (9-digit starting with 9), use it.
      let cleaned: string | null = null;
      if (piece.imb.length === 31) {
        const inner29 = piece.imb.slice(1, 30);
        const parsed = parseIMb(inner29);
        // Only adopt the 29-digit form if it yields a 9-digit MID (which is
        // C&D's actual MID format = 901052658). 6-digit MID interpretation of
        // the original 31-digit string was the misparse.
        if (parsed && parsed.mailerIdLength === 9) {
          cleaned = inner29;
        }
      }
      if (!cleaned) {
        // Already in correct form (e.g., real 31-digit IMb from a future job
        // that happens to have 9-digit MID directly), skip.
        alreadyClean++;
        continue;
      }
      if (cleaned === piece.imb) {
        alreadyClean++;
        continue;
      }

      if (correctionSamples.length < 5) {
        correctionSamples.push({ from: piece.imb, to: cleaned });
      }

      if (COMMIT) {
        // Re-derive parsed fields
        const p = parseIMb(cleaned);
        try {
          await prisma.mailPiece.update({
            where: { id: piece.id },
            data: {
              imb: cleaned,
              imbBarcodeId: p?.barcodeId ?? null,
              imbServiceType: p?.serviceType ?? null,
              imbMailerId: p?.mailerId ?? null,
              imbSerial: p?.serial ?? null,
              imbRoutingZip: p?.routingZip || null,
            },
          });
          corrected++;
        } catch (e) {
          // Unique constraint collision (another piece already has this clean IMb)
          collisions++;
          if (collisionSamples.length < 5) collisionSamples.push(`${piece.id}: ${(e as Error).message.slice(0, 100)}`);
        }
      } else {
        corrected++;
      }
    }

    cursor = batch[batch.length - 1].id;
    processed += batch.length;
    if (processed % 5000 === 0) {
      console.log(
        `  processed=${processed.toLocaleString()} corrected=${corrected.toLocaleString()} clean=${alreadyClean.toLocaleString()} unrec=${unrecoverable}`,
      );
    }
  }

  console.log(`\n─── Results ───`);
  console.log(`  Already clean: ${alreadyClean.toLocaleString()}`);
  console.log(`  ${COMMIT ? "Corrected" : "Would correct"}: ${corrected.toLocaleString()}`);
  console.log(`  Unrecoverable: ${unrecoverable}`);
  if (COMMIT) console.log(`  Collisions:    ${collisions}`);

  if (correctionSamples.length > 0) {
    console.log(`\n  Sample corrections:`);
    for (const s of correctionSamples) {
      console.log(`    ${s.from} (${s.from.length}d)`);
      console.log(`    → ${s.to} (${s.to.length}d)`);
    }
  }
  if (collisionSamples.length > 0) {
    console.log(`\n  Collision samples:`);
    for (const s of collisionSamples) console.log(`    ${s}`);
  }
  if (!COMMIT) {
    console.log(`\nRun with --commit to apply.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
