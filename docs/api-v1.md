# MailerCity API — v1

**Base URL:** `https://marketing.cndprinting.com/api/v1`
**Status:** Tracking (read) is live. Ordering (write) is scheduled for build — endpoints marked *(planned)* below.
**Owner:** C&D Printing · MailerCity · <bwaxman@cndprinting.com>

---

## What this API is for

Programmatic direct-mail from your product. Create an order (recipients + template + spec), receive a proof for approval, hand off to C&D print production, then track every piece through USPS scan-level delivery — without your users ever touching the MailerCity web UI.

Read-side (tracking) lives today. Write-side (order create, list upload, approve, cancel) is scheduled once a partner signs off on this spec.

---

## Authentication

All requests require a Bearer token in the `Authorization` header.

```
Authorization: Bearer cdk_live_a1b2c3d4e5f6...
```

**Getting a key.** Admin → **API Keys** in the MailerCity dashboard. Keys are:

- **Scoped to a single Company.** All requests act on that Company's data.
- **Scoped by permission.** Comma-separated: `read:tracking`, `write:orders`, `read:templates`, `read:pricing`. Least-privilege is the default — give a key only the scopes it needs.
- **Prefixed** `cdk_live_...` (production) or `cdk_test_...` (test mode, once available).
- **Revocable and expirable.** Delete or set `expiresAt` from the admin UI.
- **One-time display.** We store a SHA-256 hash — the raw key is shown once at creation. Rotate by creating a new key and revoking the old one.

**Authentication failure responses:**

| Code | Meaning |
|---|---|
| `401 unauthorized` | Missing / invalid / revoked / expired key |
| `403 missing scope` | Key exists but lacks the required scope |

---

## Test mode

To avoid a separate sandbox environment, order-create endpoints accept a `test_mode: true` flag. A test-mode order runs the full state machine (proof rendered, webhooks fired, tracking populated with synthetic scans), but **no artwork prints and no payment is captured**. The order is flagged `TEST` in the dashboard and never touches C&D production.

Use test mode to smoke-test your integration end-to-end for free. Remove the flag when you're ready to send real mail.

---

## Rate limits

Per-key, rolling 60-second window.

| Endpoint class | Limit |
|---|---|
| Order create (POST /orders, POST /lists) | **10 / min** |
| Reads (GET /tracking, /orders, /templates, /pricing) | **500 / min** |
| Webhooks in (from our side) | not applicable |

`429 rate_limited` on breach — retry with the `Retry-After` header.

If you need to burst higher for a scheduled campaign push, email `bwaxman@cndprinting.com` and we'll lift the limit for a window.

---

## Endpoint index

| Method | Path | Scope | Status |
|---|---|---|---|
| GET | `/api/v1/pricing` | `read:pricing` | live |
| GET | `/api/v1/templates` | `read:templates` | live |
| GET | `/api/v1/templates/{id}` | `read:templates` | live |
| POST | `/api/v1/lists` | `write:orders` | *planned* |
| POST | `/api/v1/orders` | `write:orders` | *planned* |
| GET | `/api/v1/orders/{id}` | `read:orders` | *planned* |
| POST | `/api/v1/orders/{id}/approve` | `write:orders` | *planned* |
| POST | `/api/v1/orders/{id}/cancel` | `write:orders` | *planned* |
| GET | `/api/v1/tracking` | `read:tracking` | **live** |

---

## Objects

### Recipient

```json
{
  "name": "Sarah Johnson",
  "mailing_address": {
    "street": "1247 Ocean Ave",
    "city": "St. Petersburg",
    "state": "FL",
    "zip5": "33716",
    "zip4": "1234"
  },
  "merge": {
    "parcelApn": "12-34-56-7890",
    "acreage": "4.2",
    "offerLow": "8500",
    "offerHigh": "12000",
    "senderName": "Land Buyers Co.",
    "senderPhone": "(555) 555-0100"
  }
}
```

- `mailing_address.zip4` optional; we add ZIP+4 during CASS if you don't.
- `merge` keys must match the template's declared variables (see `/api/v1/templates/{id}`). Unknown keys are dropped. Missing required keys reject the whole order with `422 recipient_missing_fields`.

### Order

```json
{
  "id": "ord_01H7GX0KZM8P0YM4TQ6VE9",
  "order_code": "CD-2026-ACME-42476",
  "status": "PROOF_READY",
  "test_mode": false,
  "template_id": "tpl_lnd_pc_001",
  "custom_design_url": null,
  "format": "postcard",
  "size": "6x8.5",
  "quantity": 3888,
  "mail_class": "standard",
  "return_address": { "street": "...", "city": "...", "state": "...", "zip5": "..." },
  "webhook_url": "https://your-crm.example.com/hooks/mailercity",
  "recipients_list_id": null,
  "recipients_count": 3888,
  "price": { "per_piece": 0.19, "postage": 0.43, "print_subtotal": 738.72, "postage_subtotal": 1671.84, "total": 2410.56, "currency": "usd" },
  "proof_url": "https://blob.vercel-storage.com/proofs/ord_...pdf",
  "drop_date": "2026-08-05",
  "created_at": "2026-07-22T17:24:01Z",
  "updated_at": "2026-07-22T17:30:12Z"
}
```

### OrderStatus lifecycle

```
DRAFT → IN_PREP → PROOF_READY → APPROVED → SCHEDULED
      → DROPPED → DELIVERING → COMPLETE
```

Terminal branches: `QUOTE_REJECTED` (declined pricing), `CANCELLED` (user cancelled), `COMPLETE` (all pieces delivered or window closed).

### Piece

```json
{
  "id": "pce_01H7...",
  "order_id": "ord_01H7GX0KZM8P0YM4TQ6VE9",
  "imb": "0027190105265823489427006852093",
  "recipient_name": "Sarah Johnson",
  "city": "St. Petersburg",
  "state": "FL",
  "zip5": "33716",
  "status": "DELIVERED",
  "first_scan_at": "2026-05-16T14:22:00Z",
  "delivered_at": "2026-05-20T09:14:00Z",
  "days_to_deliver": 4,
  "updated_at": "2026-05-20T09:14:00Z"
}
```

- `status`: `PENDING | ACCEPTED | IN_TRANSIT | OUT_FOR_DELIVERY | DELIVERED | DELIVERED_INFERRED | UNDELIVERABLE | EXPIRED_NO_SCAN`
- `DELIVERED_INFERRED` = matured through the network but no final stop-the-clock scan received. Treat as delivered for most reporting.
- `imb` = 31-digit USPS Intelligent Mail Barcode. Use as your durable per-piece id.

### Template

```json
{
  "id": "tpl_lnd_pc_001",
  "short_code": "LND-PC-001",
  "name": "Cash For Your Vacant Land — Classic",
  "industry": "land-investors",
  "category": "postcard",
  "size": "6x8.5",
  "variables": ["firstName","lastName","address1","city","state","zip5","parcelApn","acreage","offerLow","offerHigh","senderName","senderPhone"],
  "min_quantity": 500,
  "featured": true,
  "thumbnail_url": "https://blob.../thumb.png",
  "front_image_url": "https://blob.../front.png",
  "back_image_url": "https://blob.../back.png"
}
```

### Pricing schedule

```json
{
  "effective_date": "Summer Sale · ends Aug 31",
  "expires": "August 31, 2026",
  "postage_per_piece": 0.43,
  "postcards": [
    { "min_qty": 1000,  "prices": { "4.25x6": 0.16, "6x8.5": 0.21, "6x11": 0.26 } },
    { "min_qty": 5000,  "prices": { "4.25x6": 0.14, "6x8.5": 0.19, "6x11": 0.24 } },
    { "min_qty": 30000, "prices": { "4.25x6": 0.13, "6x8.5": 0.18, "6x11": 0.23 } },
    { "min_qty": 50000, "prices": { "4.25x6": 0.12, "6x8.5": 0.17, "6x11": 0.22 } }
  ],
  "letters": [
    { "min_qty": 1000,  "prices": { "1-Sheet": 0.24, "2-Sheet": 0.29 } },
    { "min_qty": 5000,  "prices": { "1-Sheet": 0.22, "2-Sheet": 0.27 } },
    { "min_qty": 30000, "prices": { "1-Sheet": 0.14, "2-Sheet": 0.19 } },
    { "min_qty": 50000, "prices": { "1-Sheet": 0.12, "2-Sheet": 0.17 } }
  ],
  "postage_note": "USPS Standard Class · automation-discounted. First-Class and volumes above 50,000 quoted on request."
}
```

---

## Endpoints

### GET `/api/v1/pricing` · live

Returns the full public rate card. Your CRM does the arithmetic; we return the schedule.

```bash
curl https://marketing.cndprinting.com/api/v1/pricing \
  -H "Authorization: Bearer cdk_live_..."
```

Response: `PricingSchedule` object (see above).

---

### GET `/api/v1/templates` · live

List all templates available to your Company.

**Query params:**

- `industry=land-investors` — filter by industry slug
- `category=postcard` — `postcard | letter | flat`
- `active=true` — default; pass `false` to include retired designs

**Response:**

```json
{ "data": [ /* Template */, /* Template */, ... ] }
```

---

### GET `/api/v1/templates/{id}` · live

Full detail for one template, including the merge-variable list your recipient `merge` object must satisfy.

---

### POST `/api/v1/lists` · *planned*

Upload a large recipient list once, reference it in one or more subsequent orders. Use this when a request would exceed the inline JSON limit (5,000 recipients).

**Request:**

```json
{
  "name": "Q3 2026 Land List",
  "recipients": [ /* Recipient */, ... ]
}
```

**Response (201):**

```json
{ "list_id": "lst_01H7...", "count": 8420, "created_at": "..." }
```

Lists are Company-scoped and stored for 90 days after last-used.

---

### POST `/api/v1/orders` · *planned*

Create a mailing order. This is the main event.

**Request:**

```json
{
  "template_id": "tpl_lnd_pc_001",
  "field_map": { "parcelApn": "apn", "offerLow": "offer_amount_low" },
  "format": "postcard",
  "size": "6x8.5",
  "mail_class": "standard",
  "recipients": [ /* Recipient */, ... ],
  "return_address": { "street": "...", "city": "...", "state": "OH", "zip5": "43220" },
  "payment": { "method": "prepaid_balance" },
  "webhook_url": "https://your-crm.example.com/hooks/mailercity",
  "external_ref": "your-crm-deal-id-42",
  "test_mode": false
}
```

**Alternative payloads:**

- **Recipients by list_id:** replace `"recipients": [...]` with `"recipients_list_id": "lst_01H7..."`
- **Custom artwork:** replace `template_id` + `field_map` with `"custom_design_url": "https://blob..."` (uploaded to Vercel Blob via a signed URL — see Uploads section).
- **Payment methods:** `prepaid_balance` (v1), `card_on_file` (v1), `invoice` (v2, on request).

**Response (201):** An `Order` object with `status: "DRAFT"` (goes to `IN_PREP` synchronously if all fields validate, else remains DRAFT with `errors[]`).

**Validation errors (422):**

| Code | Meaning |
|---|---|
| `template_variable_missing` | A recipient is missing a merge key the template requires |
| `below_minimum_quantity` | Order quantity is below the template's `min_quantity` (default 500) |
| `above_max_quantity` | Order quantity above 100,000 — email us for larger runs |
| `invalid_address` | An address failed CASS — see `invalid_indices[]` |
| `insufficient_balance` | `prepaid_balance` payment method chosen and balance < order total |

---

### GET `/api/v1/orders/{id}` · *planned*

Fetch current order state, including proof URL (once ready), delivery counts, and computed price.

Also: `?include=recipients` returns the full recipient roster (paginated).

---

### POST `/api/v1/orders/{id}/approve` · *planned*

Approve the proof and schedule the drop. Only valid when `status: PROOF_READY`. Payment captures on approval.

```json
{ "drop_date_hint": "2026-08-05" }
```

`drop_date_hint` is optional; we schedule as close to it as production allows and return the actual `drop_date` on the Order.

---

### POST `/api/v1/orders/{id}/cancel` · *planned*

Cancel an order before it reaches production. Valid statuses: `DRAFT | IN_PREP | PROOF_READY`. Not valid once `APPROVED`.

If money was pre-authorized on a card, we release the hold. Prepaid balance is refunded to the balance.

---

### GET `/api/v1/tracking` · **live**

Poll per-piece status. Cursor-based on `updated_at`, ideal for incremental sync into your CRM.

**Query params:**

- `since` — ISO-8601 timestamp; returns pieces whose `updated_at` is strictly greater
- `order_id` — restrict to one order
- `limit` — default 500, max 5000

**Response:**

```json
{
  "data": [ /* Piece */, /* Piece */, ... ],
  "next_since": "2026-05-20T09:14:00Z"
}
```

**Idempotency note:** Persist `next_since` in your CRM and use it as `since` on the next poll. `updated_at` is monotonic per piece; you won't lose events.

---

## Webhooks

If you provide `webhook_url` on an order, we POST every status transition to it. Also fires per-piece for late-arriving scans.

### Delivery guarantees

- **At-least-once.** We retry up to 6 times with exponential backoff over ~24 hours on any non-2xx response. Design idempotently — de-dup by `event_id`.
- **Signed.** Every request includes an `X-MailerCity-Signature` header: `sha256=<hex>` of the raw body, using your key's secret. Verify before trusting.
- **Ordered by best-effort, not strict.** Handle out-of-order arrivals gracefully.

### Event types

| Event | When |
|---|---|
| `order.proof_ready` | Merge proof rendered, awaiting approval |
| `order.approved` | Customer approved (or you POSTed `/approve`) |
| `order.scheduled` | Drop date locked in |
| `order.dropped` | Handed to USPS |
| `order.delivering` | First USPS scan received on any piece |
| `order.complete` | All pieces terminal (delivered / undeliverable / expired) |
| `order.cancelled` | Cancelled before print |
| `piece.scanned` | New USPS scan on any piece (opt-in — see below) |

### Payload shape

```json
{
  "event_id": "evt_01H7...",
  "event_type": "order.proof_ready",
  "created_at": "2026-07-22T17:30:12Z",
  "order": { /* Order */ },
  "piece": null
}
```

`piece` is populated on `piece.scanned` events, null otherwise.

### Opting into per-piece scan events

Order-level events fire on every order by default. Per-piece scan events (`piece.scanned`) are opt-in per key — they generate a lot of volume. Toggle `webhook_piece_scans: true` on the Order create request, or ask us to enable it key-wide.

---

## Uploads (for custom artwork)

To send finished artwork instead of using a library template, upload it to Vercel Blob first via a signed URL, then include the returned URL in your order create request as `custom_design_url`.

Coming in the *planned* order-create rollout: `POST /api/v1/uploads/sign` returns a short-lived signed URL you `PUT` your PDF to; the resulting public URL goes on the order.

**Artwork requirements:**

- Camera-ready CMYK PDF, 300 dpi, format-matched trim + 0.125" bleed
- USPS-safe zones honored (indicia area, address block, IMb clear zone)
- Front and back as separate pages OR two separate URLs

---

## The full happy path (curl walkthrough)

```bash
# 0. Set your key
KEY="cdk_live_..."
BASE="https://marketing.cndprinting.com/api/v1"

# 1. See what things cost
curl -H "Authorization: Bearer $KEY" "$BASE/pricing"

# 2. Pick a template + get its merge variables
curl -H "Authorization: Bearer $KEY" "$BASE/templates?industry=land-investors"
curl -H "Authorization: Bearer $KEY" "$BASE/templates/tpl_lnd_pc_001"

# 3. Create the order (test_mode first — no charge, no print)
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d @order.json  "$BASE/orders"

# 4. Wait for the proof_ready webhook, or poll:
curl -H "Authorization: Bearer $KEY" "$BASE/orders/ord_01H7..."

# 5. Approve
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"drop_date_hint":"2026-08-05"}'  "$BASE/orders/ord_01H7.../approve"

# 6. Poll tracking (or receive webhooks)
curl -H "Authorization: Bearer $KEY" \
  "$BASE/tracking?order_id=ord_01H7...&since=2026-07-22T00:00:00Z"
```

---

## Error responses

All errors return JSON:

```json
{ "error": "template_variable_missing", "detail": "Recipient at index 42 is missing 'parcelApn'", "field": "recipients[42].merge.parcelApn" }
```

| HTTP | Body `error` values (common) |
|---|---|
| 400 | `bad_request`, `invalid_payload` |
| 401 | `unauthorized` |
| 403 | `missing_scope`, `company_mismatch` |
| 404 | `not_found` |
| 409 | `already_approved`, `already_cancelled` |
| 422 | `template_variable_missing`, `below_minimum_quantity`, `invalid_address`, `insufficient_balance` |
| 429 | `rate_limited` (respect `Retry-After`) |
| 500 | `internal_error` (transient — retry with backoff) |

---

## Versioning & change policy

- **This is v1.** Breaking changes bump the URL prefix (`/api/v2`) and v1 remains supported for 12 months.
- **Additive changes** (new optional fields, new event types, new statuses) can land at any time under v1. Design your integration to ignore unknown fields.
- **Deprecations** get a `Sunset` header 90 days before removal.

---

## Support

- **Email:** <bwaxman@cndprinting.com>
- **Status page:** we'll spin one up before public GA
- **Incidents:** call (727) 572-9999
