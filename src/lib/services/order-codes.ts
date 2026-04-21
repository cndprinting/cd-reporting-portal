/**
 * Order code generator.
 *
 * Format:  CD-<YYYY>-<COMPANY_SLUG_FIRST_6>-<SEQ_3_DIGITS>
 * Example: CD-2026-AARON-001
 *
 * Used as a filename convention so AccuZIP outputs can be auto-matched
 * to Orders by the Mail.dat watcher.
 */

import prisma from "@/lib/prisma";

export async function generateOrderCode(companyId: string): Promise<string> {
  if (!prisma) throw new Error("Database not initialized");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { slug: true, name: true },
  });
  if (!company) throw new Error(`Company ${companyId} not found`);

  // Take first 5 alphanumeric chars of slug, uppercase
  const slug = (company.slug || company.name)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5)
    .padEnd(3, "X"); // ensure at least 3 chars

  const year = new Date().getFullYear();
  const prefix = `CD-${year}-${slug}-`;

  // Find highest existing sequence for this prefix this year
  const existing = await prisma.order.findMany({
    where: { orderCode: { startsWith: prefix } },
    select: { orderCode: true },
    orderBy: { orderCode: "desc" },
    take: 1,
  });

  let seq = 1;
  if (existing.length > 0) {
    const last = existing[0].orderCode.split("-").pop() ?? "000";
    seq = (parseInt(last, 10) || 0) + 1;
  }

  return `${prefix}${String(seq).padStart(3, "0")}`;
}

/** Parse an Order code out of an AccuZIP filename (best-effort). */
export function extractOrderCodeFromFilename(filename: string): string | null {
  const m = filename.match(/CD-\d{4}-[A-Z0-9]{3,6}-\d{3}/i);
  return m?.[0]?.toUpperCase() ?? null;
}
