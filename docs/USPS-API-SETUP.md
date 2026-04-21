# USPS Subscriptions-Tracking API — Live Setup

## Credentials (paste into Vercel env vars)

```
USPS_API_CLIENT_ID     = qwbkQRpMLF1h3oRmg0xsBa9MaqG2nXPNgY446DshpwPN9rjO
USPS_API_CLIENT_SECRET = w5rM9NF2qjYmMXLzcvwoaeijITe3gLGTf8bB5dZuHgKkpGrjjUVNg0Fs6378MjDU
USPS_API_BASE          = https://apis.usps.com
```

## Active Subscriptions

| ID | MID | Status |
|---|---|---|
| `019db15c-05e8-7432-95dc-8c511d2f9a1b` | 901052658 | ENABLED |
| `019db15c-a559-7375-b5e9-426b1ed9cd0f` | 901513023 | ENABLED |

All subscriptions push to:
- URL: `https://marketing.cndprinting.com/api/iv-mtr/ingest`
- Secret: `v9Tq2BxM6pR3nL8kH5dF1wZ4yC7jE0sA` (same as `IV_MTR_INGEST_KEY` env)

## Manage subscriptions via curl

Get OAuth token:
```bash
curl -s -X POST https://apis.usps.com/oauth2/v3/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"'$USPS_API_CLIENT_ID'","client_secret":"'$USPS_API_CLIENT_SECRET'"}' \
  | jq -r .access_token
```

List subscriptions (requires the ID, no blanket GET):
```bash
curl -s https://apis.usps.com/subscriptions-tracking/v3/subscriptions/019db15c-05e8-7432-95dc-8c511d2f9a1b \
  -H "Authorization: Bearer $TOKEN"
```

Delete a subscription:
```bash
curl -X DELETE https://apis.usps.com/subscriptions-tracking/v3/subscriptions/<id> \
  -H "Authorization: Bearer $TOKEN"
```

Create a new subscription:
```bash
curl -X POST https://apis.usps.com/subscriptions-tracking/v3/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionName": "...",
    "listenerURL": "https://marketing.cndprinting.com/api/iv-mtr/ingest",
    "secret": "...",
    "adminNotification": [{"email": "bwaxman@cndprinting.com"}],
    "filterProperties": {"MID": "901052658"}
  }'
```

## What happens next

1. USPS's Subscriptions-Tracking service watches for any mail under MID 901052658 or 901513023
2. As USPS sorters scan a piece, a tracking event fires
3. USPS POSTs the event (JSON) to `https://marketing.cndprinting.com/api/iv-mtr/ingest` with our secret
4. Our ingest endpoint parses the event, looks up the MailPiece by IMb, writes a ScanEvent row, updates MailPiece.status
5. Dashboards (/dashboard/mail) show the delivery data in real time

## Troubleshooting

- Check Vercel Logs for `[iv-mtr/ingest]` log entries — every USPS push is logged with headers + body preview
- Check `/dashboard/admin/ingestion` for health monitoring
- If USPS pauses our subscription (e.g., too many failures), they'll email `bwaxman@cndprinting.com` per the adminNotification config
