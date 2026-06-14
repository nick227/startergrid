---
title: Webhook Lead Alerts
summary: How to connect any HTTPS endpoint to receive lead payloads, including signature verification.
keywords: webhook, https, payload, json, hmac, signature, zapier, make, automation
updated: 2026-06-13
---

A webhook delivers the full lead payload as a JSON POST to any HTTPS URL you control. This is the most flexible channel — it works out of the box with Zapier, Make, n8n, Slack, and any custom backend.

## What gets posted

```
POST https://your-endpoint.example.com/leads
Content-Type: application/json
X-Dealer-Signature: sha256=abc123...  (only if a secret is set)
```

```json
{
  "event": "lead.captured",
  "leadId": "clxxx...",
  "platformSlug": "consumer-marketplace",
  "dealerName": "Prairie Ridge Motors",
  "vehicleRef": "Stock #DM-2024-042",
  "contact": {
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "phone": "+15551234567",
    "message": "Is this still available?"
  }
}
```

Contact fields the buyer left blank are omitted.

## Requirements

The URL must be HTTPS and must return a 2xx response. Non-2xx responses are logged as a delivery failure. The request times out after 10 seconds.

## Setting up with Zapier

1. In Zapier, create a new Zap → trigger: **Webhooks by Zapier** → **Catch Hook**.
2. Copy the webhook URL Zapier provides.
3. Paste it into **Leads** → **Notification channels** → **Webhook → URL** → Save.
4. Submit a test lead through the marketplace to trigger the first payload.
5. Zapier captures it — use it to map fields to your action (CRM entry, Slack message, spreadsheet row, etc.).

## Setting up with Make (Integromat)

1. Create a scenario → trigger: **Webhooks** → **Custom webhook** → **Add** → copy the URL.
2. Paste into the Webhook URL field in the portal and save.
3. Send a test lead — Make receives it and lets you map the JSON structure.

## Signing secret (optional)

A signing secret lets your endpoint verify that the request came from this system and was not tampered with.

1. Enter any secret string in the **Signing secret** field alongside the URL.
2. Each request will include an `X-Dealer-Signature: sha256=<hmac>` header.
3. On your server, compute `HMAC-SHA256(secret, raw_body)` and compare to the header value. If they match, the request is authentic.

Do not share the secret. Rotate it by entering a new value and saving — old deliveries are not re-sent.

## Testing quickly

Use [webhook.site](https://webhook.site) to get a free temporary URL. Paste it in, fire a test lead, and inspect the full payload in the browser — no server needed.

See [Lead notification channels](doc:connections/lead-notifications) for a full channel comparison.
