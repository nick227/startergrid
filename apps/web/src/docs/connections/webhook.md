---
visibility: public
id: connections-webhook
feature: lead-notifications
type: reference
audience: staff, developer
tags: lead notifications, leads
synonyms: webhook, https, payload, json, hmac, zapier
aliases: connections/webhook
related: connections-lead-notifications
title: Send inquiries to another system
summary: Post each new lead as JSON to an HTTPS address you control. Signing is optional.
keywords: webhook, https, payload, json, hmac, zapier
updated: 2026-10-27
advanced: true
---

A webhook sends the full inquiry to an HTTPS URL as a JSON POST. Use it for Zapier, Make, Slack, or your CRM.

## What to do

In StarterGrid, open **Settings → How you hear about new inquiries → Optional delivery methods**.

1. Create a catch-hook URL in Zapier, Make, or your server.
2. Paste it into How you hear about new inquiries → Webhook and save.
3. Send a test inquiry and map the fields.

The URL must be HTTPS and return a 2xx within 10 seconds.

## What gets posted

```
POST https://your-endpoint.example.com/leads
Content-Type: application/json
X-Dealer-Signature: sha256=…  (only if you set a secret)
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

Blank contact fields are omitted.

## Signing secret

If you enter a secret, each request includes `X-Dealer-Signature: sha256=<hmac>`. Verify with `HMAC-SHA256(secret, raw_body)`. Rotate the secret by saving a new value.

See [Choose how you hear about new inquiries](doc:connections/lead-notifications).
