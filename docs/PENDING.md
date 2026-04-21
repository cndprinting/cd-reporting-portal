# Pending Setup Items

Everything below is configuration only — no code changes needed. Deploys and core features are already live.

---

## 1. Resend (transactional email)

**Blocks:** Weekly customer reports, branded invite emails, password reset emails

**Steps:**
1. Sign up at https://resend.com (free tier: 3,000 emails/month)
2. Add sending domain `cndprinting.com`
3. Verify DNS (Resend gives you 3 TXT/MX records to add in GoDaddy)
4. Create API key
5. Add to Vercel env vars:
   ```
   RESEND_API_KEY = re_xxxxx
   EMAIL_FROM     = C&D Reports <reports@cndprinting.com>
   ```
6. Redeploy

**Impact once done:**
- Admin "Send Now" button in `/dashboard/admin/reports` works
- Monday 7am ET weekly cron fires branded emails to all customer contacts
- New user invites arrive as branded emails (currently requires manual link copy)

---

## 2. USPS IV-MTR credentials

**Blocks:** Real-time mail tracking scan data

**Status:** Waiting on C&D team to submit IV-MTR service request in BCG
(see `docs/IV-MTR-REQUEST-FORM.md` for exact form values)

**Timeline after submit:** 5-10 business days for USPS approval

**After USPS approves, add to Vercel env vars:**
```
IV_MTR_USER_ID   = <BCG username>
IV_MTR_PASSWORD  = <BCG password>
IV_MTR_API_BASE  = https://iv.usps.com/ivws/api   (or what USPS specifies)
```

Then in IV-MTR web UI:
- Create Data Delegation (recipient CRID: 2504758, source MID: 901052658)
- Set frequency to daily (Hobby plan limit) — or upgrade to Pro for every 30 min

**Impact once done:**
- `/api/iv-mtr/pull` cron (6am UTC daily) starts fetching real scans
- `/dashboard/mail-tracking` shows real delivery data, not demo
- `/dashboard/admin/ingestion` starts logging feed health
- Customer `/dashboard/my-tracking` shows live delivery status
- Weekly reports include real numbers

---

## 3. (Optional) Upgrade Vercel to Pro

**Blocks:** Cron frequency better than daily

**Cost:** $20/month per team member

**Impact:**
- IV-MTR pull every 30 min instead of daily
- Concurrent builds (faster deploys)
- More generous build minutes + bandwidth

Not required — daily IV-MTR pulls work fine for launch. Upgrade only if scan latency becomes a business issue.
