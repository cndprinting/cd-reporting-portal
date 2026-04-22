# AccuZIP → C&D Marketing Portal Watcher

Runs on the Windows workstation that hosts AccuZIP. Watches a folder, and every
time AccuZIP finishes writing a job output file (`.csv`, `.pbc`, `.json`), this
watcher POSTs it to the portal's `/api/maildat/ingest` endpoint. The portal
parses the IMbs, creates `MailBatch` + `MailPiece` rows, and links them to the
right Campaign via the filename convention.

## Filename convention

```
CD-<YEAR>-<CUSTOMER>-<NNN>.<ext>
```

Example: `CD-2026-AARON-001.csv`

The portion before the extension must match a `Campaign.campaignCode` already
in the portal. The watcher extracts this and passes it as the `campaignCode`
query param.

## Setup

1. **Install Node 20+** on the AccuZIP workstation.
2. **Copy this folder** to e.g. `C:\cd-accuzip-watcher`.
3. `cd C:\cd-accuzip-watcher && npm install`
4. `copy .env.example .env` and fill in:
   - `WATCH_DIR` — the folder AccuZIP writes finished job files to
     *(Tom/Mike to confirm exact path)*
   - `PORTAL_URL` — `https://marketing.cndprinting.com`
   - `INGEST_KEY` — same value as `IV_MTR_INGEST_KEY` in Vercel env vars
5. **Test manually:** `npm start` and drop a sample file in `WATCH_DIR`.
   - On success it moves to `WATCH_DIR\processed\`
   - On failure it moves to `WATCH_DIR\failed\` with a `.error.txt` log
6. **Install as a service** so it auto-starts:
   - Download [nssm.exe](https://nssm.cc/download) and put it on PATH
   - Open an Admin cmd prompt: `npm run install-service`

## Operations

| Task | Command |
|------|---------|
| Start service | `nssm start CDAccuZipWatcher` |
| Stop service | `nssm stop CDAccuZipWatcher` |
| View logs | `type watcher.out.log` |
| Uninstall | `npm run uninstall-service` |

## What the portal does on receipt

- Validates auth (`x-iv-mtr-key` header)
- Resolves `campaignCode` → `campaignId`
- Creates a `MailBatch` with `batchName = "AccuZIP auto-import <timestamp>"`
- Parses IMbs from the file and creates `MailPiece` rows (one per IMb)
- Returns JSON: `{ campaignId, mailBatchId, piecesParsed, ... }`

Once in the portal, IMb scans coming from USPS's Subscriptions-Tracking API
automatically match to these MailPieces and update delivery status per piece.
