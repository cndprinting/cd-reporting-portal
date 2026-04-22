#!/usr/bin/env node
/**
 * AccuZIP → C&D Marketing Portal file watcher.
 *
 * Runs on the Windows workstation where AccuZIP drops finished job files.
 * Watches a configured folder for new .csv / .pbc / .json files, extracts the
 * campaign code from the filename, and POSTs the file to the portal's
 * /api/maildat/ingest endpoint. Successful files are moved to `processed/`;
 * failures are moved to `failed/` with a sibling `.error.txt` log.
 *
 * ── Filename convention ────────────────────────────────────────────────
 *   CD-<YEAR>-<CUSTOMER>-<NNN>.<ext>   e.g. CD-2026-AARON-001.csv
 *   The portion before the extension must match a Campaign.campaignCode
 *   (or Order.orderCode) in the portal.
 *
 * ── Setup ──────────────────────────────────────────────────────────────
 *   1. Install Node 20+ on the AccuZIP workstation.
 *   2. Copy this folder to C:\cd-accuzip-watcher (or wherever).
 *   3. Run `npm install` inside it.
 *   4. Copy .env.example → .env and fill in the values.
 *   5. Test: `node watcher.js`
 *   6. Install as a Windows service: `npm run install-service` (uses nssm).
 *
 * ── Config (.env) ──────────────────────────────────────────────────────
 *   WATCH_DIR=C:\AccuZIP\Output          ← folder to monitor
 *   PORTAL_URL=https://marketing.cndprinting.com
 *   INGEST_KEY=<IV_MTR_INGEST_KEY from Vercel>
 *   POLL_INTERVAL_MS=5000                ← optional, default 5s
 *   FILE_STABLE_MS=3000                  ← wait this long after last write
 *                                          before processing (ensures AccuZIP
 *                                          finished writing the file)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
require("dotenv").config();

// ── Config ────────────────────────────────────────────────────────────
const WATCH_DIR = process.env.WATCH_DIR;
const PORTAL_URL = (process.env.PORTAL_URL || "").replace(/\/$/, "");
const INGEST_KEY = process.env.INGEST_KEY;
const FILE_STABLE_MS = Number(process.env.FILE_STABLE_MS || 3000);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const SUPPORTED_EXT = [".csv", ".pbc", ".json", ".txt"];

if (!WATCH_DIR || !PORTAL_URL || !INGEST_KEY) {
  console.error(
    "[fatal] Missing required env vars. Need WATCH_DIR, PORTAL_URL, INGEST_KEY. See .env.example.",
  );
  process.exit(1);
}
if (!fs.existsSync(WATCH_DIR)) {
  console.error(`[fatal] WATCH_DIR does not exist: ${WATCH_DIR}`);
  process.exit(1);
}

const PROCESSED_DIR = path.join(WATCH_DIR, "processed");
const FAILED_DIR = path.join(WATCH_DIR, "failed");
fs.mkdirSync(PROCESSED_DIR, { recursive: true });
fs.mkdirSync(FAILED_DIR, { recursive: true });

const log = (...args) =>
  console.log(`[${new Date().toISOString()}]`, ...args);

// ── Extract campaign code from filename ───────────────────────────────
// Matches CD-YYYY-NAME-NNN (the portion before the extension)
function extractCampaignCode(fileName) {
  const base = path.basename(fileName, path.extname(fileName));
  // Accept exact match or the first CD-... token if there's trailing cruft
  const m = base.match(/^(CD-\d{4}-[A-Z0-9]+-\d{3,})/i);
  return m ? m[1].toUpperCase() : base.toUpperCase();
}

// Map extension → Content-Type the ingest endpoint expects
function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") return "application/json";
  if (ext === ".csv") return "text/csv";
  return "text/plain"; // .pbc, .txt → fixed-width fallback
}

// ── POST a finished file to the portal ────────────────────────────────
async function ingestFile(filePath) {
  const fileName = path.basename(filePath);
  const campaignCode = extractCampaignCode(fileName);
  const body = fs.readFileSync(filePath);
  const url = `${PORTAL_URL}/api/maildat/ingest?campaignCode=${encodeURIComponent(campaignCode)}`;

  log(`→ POST ${fileName}  (campaignCode=${campaignCode}, ${body.length} bytes)`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": contentTypeFor(filePath),
      "x-iv-mtr-key": INGEST_KEY,
      "x-source-filename": fileName,
    },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

// ── Move file with retry (Windows sometimes holds a lock briefly) ─────
async function moveFile(src, dstDir) {
  const dst = path.join(dstDir, path.basename(src));
  for (let i = 0; i < 5; i++) {
    try {
      fs.renameSync(src, dst);
      return dst;
    } catch (e) {
      if (i === 4) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

// ── Stable-file detector: only process files whose size hasn't changed
//    for FILE_STABLE_MS (AccuZIP may still be writing) ─────────────────
const pending = new Map(); // filePath → { size, firstSeenAt, lastCheckAt }

async function checkStableAndProcess(filePath) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    pending.delete(filePath);
    return;
  }
  const prev = pending.get(filePath);
  const now = Date.now();

  if (!prev || prev.size !== stat.size) {
    pending.set(filePath, { size: stat.size, firstSeenAt: now, lastCheckAt: now });
    return;
  }
  if (now - prev.lastCheckAt < FILE_STABLE_MS) return;

  // File has been stable long enough — process it
  pending.delete(filePath);
  try {
    const result = await ingestFile(filePath);
    log(`✓ ingested ${path.basename(filePath)} →`, result);
    await moveFile(filePath, PROCESSED_DIR);
  } catch (e) {
    log(`✗ FAILED ${path.basename(filePath)}: ${e.message}`);
    try {
      await moveFile(filePath, FAILED_DIR);
      fs.writeFileSync(
        path.join(FAILED_DIR, path.basename(filePath) + ".error.txt"),
        `${new Date().toISOString()}\n${e.stack || e.message}\n`,
      );
    } catch (moveErr) {
      log(`   (could not move to failed/: ${moveErr.message})`);
    }
  }
}

// ── Wire up chokidar ──────────────────────────────────────────────────
log(`watching: ${WATCH_DIR}`);
log(`portal:   ${PORTAL_URL}`);
log(`stable window: ${FILE_STABLE_MS}ms, poll: ${POLL_INTERVAL_MS}ms`);

const watcher = chokidar.watch(WATCH_DIR, {
  ignored: (p) => {
    // Skip subdirs and unsupported extensions
    if (p === WATCH_DIR) return false;
    const rel = path.relative(WATCH_DIR, p);
    if (rel.startsWith("processed") || rel.startsWith("failed")) return true;
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return true;
    const ext = path.extname(p).toLowerCase();
    return !SUPPORTED_EXT.includes(ext);
  },
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: false, // we do our own stability check
  depth: 0,
});

watcher.on("add", (p) => {
  log(`+ detected ${path.basename(p)}`);
  pending.set(p, { size: -1, firstSeenAt: Date.now(), lastCheckAt: 0 });
});
watcher.on("change", (p) => {
  pending.set(p, { size: -1, firstSeenAt: Date.now(), lastCheckAt: 0 });
});
watcher.on("error", (err) => log(`[watcher error] ${err.message}`));

// Poll pending files for stability
setInterval(() => {
  for (const filePath of pending.keys()) {
    checkStableAndProcess(filePath).catch((e) =>
      log(`[poll error] ${filePath}: ${e.message}`),
    );
  }
}, POLL_INTERVAL_MS);

// Graceful shutdown
process.on("SIGINT", () => {
  log("shutting down…");
  watcher.close().then(() => process.exit(0));
});
