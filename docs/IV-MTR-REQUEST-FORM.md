# IV-MTR Service Request — Ready-to-Submit Answers

Follow these steps in the Business Customer Gateway (BCG). Every field the form asks for is answered below — just copy/paste.

> **Who submits:** whoever holds the C&D BCG login (the Business Service Administrator for CRID 2504758). Needs to be done while signed into that account.
> **Expected approval:** 5–10 business days.

---

## Step 1 — Sign in

1. Go to **https://gateway.usps.com**
2. Sign in with the C&D BCG credentials
3. Confirm CRID **2504758** (C&D Printing) is the active business location in the top-right selector

---

## Step 2 — Navigate to Service Request

From the BCG home page:

**Manage Services** → **Request Service** → select **Informed Visibility — Mail Tracking & Reporting (IV-MTR)**

---

## Step 3 — Fill out the form

USPS's form asks for these fields (exact labels may vary slightly). Paste the values in the right column.

| BCG Field | Value to enter |
|---|---|
| **Business Location / CRID** | `2504758` |
| **Company Name** | `C&D Printing` |
| **Primary Contact Name** | *(the submitter — Benjy Waxman or whoever is signed in)* |
| **Primary Contact Email** | *(your C&D email address)* |
| **Primary Contact Phone** | *(C&D main business line)* |
| **Requested Service** | Informed Visibility Mail Tracking & Reporting |
| **Mailer ID(s) to enroll** | `901052658` |
| **Mail Type / Mail Class** | All Mail Classes (Letters + Flats + Parcels) |
| **Data Type** | Scan / Tracking Data |
| **Delivery Frequency** | Near real-time (every 15 minutes) |
| **Data Delivery Method** | Start with Pull API (switch to S3 push once volume grows) |
| **Estimated Annual Volume** | *(fill with C&D's actual number — if unsure, use "5,000,000 pieces/year")* |
| **Business Justification** | Paste the justification text below |
| **Terms & Conditions** | Accept |

### Business Justification (paste this into the text area)

> C&D Printing is a commercial printer and direct-mail provider serving regional and national clients. We are building an internal mail-tracking and reporting platform that ingests IV-MTR scan events to give our customers visibility into delivery status of their campaigns. Tracking data will be used for (a) operational quality assurance of our own mail inductions, (b) delivery-window forecasting for our customers, and (c) attribution analysis alongside call-tracking and digital-ad data within our reporting portal. All data stays within C&D's infrastructure and is exposed only to the mail owner / customer who paid for the mailing. We request near-real-time scan feeds for MID 901052658 across all mail classes.

---

## Step 4 — Users who need access

When the form asks which BCG users should be granted IV-MTR admin:

- The submitter (default)
- Add Benjy Waxman (if not the submitter)
- Add one engineer/admin who will maintain the ingestion pipeline

For each added user you'll need their BCG **username** (not email). If they don't have a BCG account yet, they can create one at https://gateway.usps.com → New User Registration → then the BSA approves them.

---

## Step 5 — Submit & wait

- Click **Submit**
- You'll get an email confirmation within a few minutes ("Service Request Received")
- USPS reviews it manually — approval email typically arrives **5–10 business days** later
- Subject will be like "Your Informed Visibility service request has been approved"
- If it stalls past 10 business days, call USPS Mailing & Shipping Solutions Center: **1-877-672-0007** and reference the service request number from your confirmation email

---

## Step 6 — After approval (what USPS will give you)

Once approved, sign back into BCG and go to IV-MTR. USPS will provision:

1. **Access to the IV-MTR web UI** (for manual reports + configuration)
2. **API endpoint credentials** (for our pull cron at `/api/iv-mtr/pull`)
3. **An S3 endpoint + credentials** (optional — for push delivery when we upgrade later)

Collect these and put them into **Vercel → Project Settings → Environment Variables**:

```
IV_MTR_USER_ID       = <BCG username used for API access>
IV_MTR_PASSWORD      = <BCG password for that user>
IV_MTR_API_BASE      = https://iv.usps.com/ivws/api    (or whatever USPS specifies)
IV_MTR_INGEST_KEY    = <generate: openssl rand -base64 32>
CRON_SECRET          = <generate: openssl rand -base64 32>
```

`USPS_CRID` and `IV_MTR_MID` are already hard-coded as defaults in `src/lib/usps-config.ts` (2504758 / 901052658), so you don't need to set those unless they change.

---

## Step 7 — Configure Data Delegation (inside IV-MTR, after approval)

In the IV-MTR web UI:

1. Navigate to **Data Delegation** → **Create New Delegation**
2. Fill in:
   - **Data Recipient CRID:** `2504758` (ourselves)
   - **Data Source — MIDs:** `901052658`
   - **Data Source — CRIDs:** `2504758`
   - **Mail Classes:** All
   - **Scan Events:** All event types (Origin, In-Transit, Destination, Delivery, UAA)
   - **Start Date:** today
   - **End Date:** leave blank (ongoing)
   - **Frequency:** Every 15 minutes
3. Save

Scans will begin flowing within 1 hour. Verify using seed pieces (see `docs/IV-MTR-SETUP.md` Step 6).

---

## Troubleshooting

- **"CRID has no active BSA"** → Someone needs to claim BSA role for CRID 2504758 in BCG. Contact USPS MSSC.
- **"MID not enrolled in IV"** → IV-MTR hasn't been approved yet. Wait for the approval email.
- **"No data delegation exists"** → You approved IV-MTR but haven't created the delegation (Step 7).
- **Scans not arriving** → Check `IVFeedIngestion` table in our portal admin; failed pulls log errors there.

---

## Quick reference card

```
C&D Printing
CRID:  2504758
MID:   901052658 (9-digit)
BCG:   gateway.usps.com
USPS Support: 1-877-672-0007 (MSSC) / IV@usps.gov
```
