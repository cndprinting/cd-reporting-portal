/**
 * SharePoint AccuZIP folder watcher.
 *
 * Walks the drop folders inside the configured SharePoint Documents library:
 *   - Each immediate subfolder of the library root represents a customer
 *     (e.g. "BH Land Group"), EXCEPT system folders prefixed with `_`
 *     (`_unsorted`, `_processed`, `_errors`).
 *   - Any file in a customer subfolder OR in `_unsorted` is processed:
 *     parsed for IMbs (handles .zip Presort folders or raw .pbc files),
 *     imported as MailPieces tied to the customer.
 *   - On success, the file is moved to `_processed/`.
 *   - On failure, moved to `_errors/` with a sibling `.error.txt`.
 *
 * Idempotent: tracks every processed file by SharePoint item ID in
 * `SharepointImport`, so re-running the cron never reprocesses.
 */

import JSZip from "jszip";
import prisma from "@/lib/prisma";
import {
  resolveSiteId,
  getDefaultDriveId,
  listChildrenByPath,
  downloadFile,
  moveItem,
  uploadSmallFile,
  type DriveItem,
} from "./graph";
import { parsePBC } from "./maildat";
import { importMailFile } from "./iv-mtr-ingest";

const SITE_HOSTNAME = "cndprinting.sharepoint.com";
const SITE_PATH = "/sites/MailerCityMarketingPortalOperations";
const SYSTEM_FOLDERS = new Set(["_unsorted", "_processed", "_errors"]);
const ALLOWED_EXTS = new Set([".zip", ".pbc"]);

interface SiteContext {
  siteId: string;
  driveId: string;
  systemFolderIds: { processed: string; errors: string; unsorted: string };
}

async function ctx(): Promise<SiteContext> {
  const siteId = await resolveSiteId(SITE_HOSTNAME, SITE_PATH);
  const driveId = await getDefaultDriveId(siteId);
  const rootChildren = await listChildrenByPath(driveId, "");
  const findId = (name: string) => {
    const f = rootChildren.find((c) => c.name === name && c.folder);
    if (!f)
      throw new Error(
        `Required system folder "${name}" not found in SharePoint library root`,
      );
    return f.id;
  };
  return {
    siteId,
    driveId,
    systemFolderIds: {
      processed: findId("_processed"),
      errors: findId("_errors"),
      unsorted: findId("_unsorted"),
    },
  };
}

function fuzzyCompanyMatch(folderName: string, companyName: string): boolean {
  const norm = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return norm(folderName) === norm(companyName);
}

/**
 * Resolve a customer subfolder name → Company.id.
 * - Tries exact normalized match first
 * - Falls back to creating a new Company if no match (admin can clean up later)
 */
async function resolveCompany(folderName: string): Promise<string> {
  if (!prisma) throw new Error("DB not initialized");
  const all = await prisma.company.findMany({ select: { id: true, name: true } });
  const match = all.find((c) => fuzzyCompanyMatch(folderName, c.name));
  if (match) return match.id;

  // Auto-create — admin can clean it up via the dedupe combobox later
  const slug = folderName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const created = await prisma.company.create({
    data: {
      name: folderName,
      slug: slug || `auto-${Date.now()}`,
      industry: null,
    },
  });
  return created.id;
}

/**
 * Resolve (or create) a Campaign for the customer.
 * For auto-imported AccuZIP jobs, we use a single "Auto Import" campaign per
 * company unless the filename encodes a job number we can split on.
 */
async function resolveCampaign(companyId: string): Promise<string> {
  if (!prisma) throw new Error("DB not initialized");
  const existing = await prisma.campaign.findFirst({
    where: { companyId, name: "Auto Import (SharePoint)" },
  });
  if (existing) return existing.id;
  // Generate a unique-ish campaign code
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const code = `CD-${new Date().getFullYear()}-${(company?.name ?? "auto")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 8)}-AUTO`;
  const created = await prisma.campaign.create({
    data: {
      companyId,
      name: "Auto Import (SharePoint)",
      campaignCode: code,
      description: "Catch-all campaign for AccuZIP jobs auto-imported via SharePoint folder watch",
    },
  });
  return created.id;
}

async function extractPbcText(buffer: Buffer, filename: string): Promise<string> {
  if (filename.toLowerCase().endsWith(".zip")) {
    const zip = await JSZip.loadAsync(buffer);
    const entry = Object.values(zip.files).find((f) => {
      if (f.dir) return false;
      const base = f.name.split("/").pop()?.toLowerCase() ?? "";
      return base === "maildat.pbc";
    });
    if (!entry) throw new Error("ZIP missing maildat.pbc — not a Presort folder?");
    return await entry.async("string");
  }
  return buffer.toString("utf8");
}

/**
 * Try to extract an order code from the filename. Tom's instructed to name
 * his Presort ZIPs with the order code as the prefix (e.g.
 *   "CD-2026-BHLAND-001.zip"
 *   "CD-2026-BHLAND-001 Spring outreach.zip"
 *   "CD-2026-BHLAND-001-final.pbc"
 * ).
 *
 * Returns the matched code or null. Trailing junk is fine; we just need a
 * starts-with-CD-YYYY-NAME-NNN pattern.
 */
function extractOrderCodeFromFilename(filename: string): string | null {
  const m = filename.match(/(CD-\d{4}-[A-Z0-9]+-\d{1,8})/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Try to find an existing Order matching the filename's order code that's
 * waiting for production data (status DRAFT or IN_PREP). Returns the order
 * (with its company + campaign info) or null.
 */
async function findExistingOrderForFile(filename: string) {
  if (!prisma) return null;
  const code = extractOrderCodeFromFilename(filename);
  if (!code) return null;
  return prisma.order.findUnique({
    where: { orderCode: code },
    select: {
      id: true,
      orderCode: true,
      status: true,
      companyId: true,
      campaignId: true,
      isCustomQuote: true,
    },
  });
}

async function processFile(
  c: SiteContext,
  file: DriveItem,
  customerFolderName: string,
): Promise<{ ok: boolean; importId: string }> {
  if (!prisma) throw new Error("DB not initialized");

  // Idempotency check — bail if we've seen this item before
  const existing = await prisma.sharepointImport.findUnique({
    where: { sharepointItemId: file.id },
  });
  if (existing) return { ok: existing.status === "COMPLETED", importId: existing.id };

  const importLog = await prisma.sharepointImport.create({
    data: {
      sharepointItemId: file.id,
      fileName: file.name,
      fileSize: file.size ?? 0,
      folderName: customerFolderName,
      status: "PROCESSING",
    },
  });

  try {
    // Download + parse
    const buffer = await downloadFile(c.driveId, file.id);
    const pbcText = await extractPbcText(buffer, file.name);
    const pieces = parsePBC(pbcText);
    const validPieces = pieces.filter((p) => p.imb && /^\d{20,31}$/.test(p.imb));

    if (validPieces.length === 0) {
      throw new Error(
        `No valid IMbs in maildat.pbc (parsed ${pieces.length} rows, none matched the 20-31 digit pattern)`,
      );
    }

    // PREFERRED PATH — match the file to an existing order by filename.
    // Tom names his ZIPs `<orderCode>.zip` so we can attach IMbs directly
    // to the customer's actual order (which already has the proof, payment,
    // and tracking dashboard set up).
    const matchedOrder = await findExistingOrderForFile(file.name);
    let companyId: string;
    let campaignId: string;
    let order: { id: string; orderCode: string };

    if (matchedOrder) {
      // Sanity-check: matched order's company should equal the folder
      const folderCompanyId =
        customerFolderName === "_unsorted"
          ? null
          : await resolveCompany(customerFolderName).catch(() => null);
      if (folderCompanyId && folderCompanyId !== matchedOrder.companyId) {
        throw new Error(
          `Filename matches order ${matchedOrder.orderCode} but the customer folder "${customerFolderName}" doesn't match that order's company. Move the file to the right folder.`,
        );
      }
      companyId = matchedOrder.companyId;
      campaignId = matchedOrder.campaignId;
      order = { id: matchedOrder.id, orderCode: matchedOrder.orderCode };
      // Don't change status — admin's normal lifecycle will handle DROPPED
      // when the mail is actually handed to USPS. This just attaches IMbs.
    } else {
      // FALLBACK PATH — no order match, behave like before. Auto-create a
      // new order in DROPPED state under the customer folder's company.
      const fallbackCompanyId =
        customerFolderName === "_unsorted"
          ? null
          : await resolveCompany(customerFolderName);
      if (!fallbackCompanyId) {
        throw new Error(
          "File dropped in _unsorted with no matching order code in filename. Admin must either (a) move to a customer folder OR (b) rename file with a matching order code.",
        );
      }
      companyId = fallbackCompanyId;
      campaignId = await resolveCampaign(companyId);
      const orderCode = `CD-${new Date().getFullYear()}-${customerFolderName
        .replace(/[^A-Z0-9]/gi, "")
        .toUpperCase()
        .slice(0, 8)}-${Math.floor(Date.now() / 1000) % 100000}`;
      const created = await prisma.order.create({
        data: {
          orderCode,
          companyId,
          campaignId,
          description: `Auto-imported from SharePoint: ${file.name}`,
          quantity: validPieces.length,
          status: "DROPPED", // already processed by AccuZIP, presumed in mail
          droppedAt: new Date(),
          createdBy: "system-sharepoint-watcher",
        },
      });
      order = { id: created.id, orderCode: created.orderCode };
    }

    // Create a MailBatch + import IMbs as MailPieces (works for both paths)
    const batch = await prisma.mailBatch.create({
      data: {
        campaignId,
        batchName: `${order.orderCode} SharePoint auto-import`,
        quantity: validPieces.length,
        dropDate: new Date(),
        status: "processed",
      },
    });
    const result = await importMailFile({
      campaignId,
      mailBatchId: batch.id,
      rows: validPieces.map((p) => ({ imb: p.imb })),
    });

    // Move the SharePoint file into _processed
    await moveItem(c.driveId, file.id, c.systemFolderIds.processed);

    await prisma.sharepointImport.update({
      where: { id: importLog.id },
      data: {
        matchedCompanyId: companyId,
        createdOrderId: order.id,
        createdCampaignId: campaignId,
        imbsImported: result.inserted,
        imbsSkipped: result.skipped,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return { ok: true, importId: importLog.id };
  } catch (e) {
    const errMsg = (e as Error).message;
    // Move file to _errors and write a sibling .error.txt
    try {
      await moveItem(c.driveId, file.id, c.systemFolderIds.errors);
      await uploadSmallFile(
        c.driveId,
        c.systemFolderIds.errors,
        `${file.name}.error.txt`,
        `${new Date().toISOString()}\n${errMsg}\n`,
      );
    } catch {
      /* best-effort */
    }
    await prisma.sharepointImport.update({
      where: { id: importLog.id },
      data: {
        status: "FAILED",
        errorMessage: errMsg.slice(0, 1000),
        completedAt: new Date(),
      },
    });
    return { ok: false, importId: importLog.id };
  }
}

/** Single full poll: walk every customer folder + _unsorted, process new files. */
export async function pollSharePoint(): Promise<{
  scanned: number;
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const c = await ctx();
  const root = await listChildrenByPath(c.driveId, "");
  const customerFolders = root.filter(
    (item) => item.folder && !SYSTEM_FOLDERS.has(item.name),
  );

  // Also process _unsorted (admin should rarely use it but handle gracefully)
  const targets: { folder: DriveItem; name: string }[] = customerFolders.map((f) => ({
    folder: f,
    name: f.name,
  }));
  const unsortedFolder = root.find((i) => i.name === "_unsorted" && i.folder);
  if (unsortedFolder) targets.push({ folder: unsortedFolder, name: "_unsorted" });

  let scanned = 0;
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const t of targets) {
    let children: DriveItem[];
    try {
      children = await listChildrenByPath(c.driveId, t.folder.name);
    } catch (e) {
      errors.push(`list ${t.name}: ${(e as Error).message}`);
      continue;
    }
    for (const file of children) {
      if (file.folder) continue;
      const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();
      if (!ALLOWED_EXTS.has(ext)) {
        skipped++;
        continue;
      }
      scanned++;
      try {
        const r = await processFile(c, file, t.name);
        if (r.ok) processed++;
        else failed++;
      } catch (e) {
        failed++;
        errors.push(`${t.name}/${file.name}: ${(e as Error).message}`);
      }
    }
  }

  return { scanned, processed, failed, skipped, errors };
}
