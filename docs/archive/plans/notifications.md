# Lead Notification Channels

When a buyer submits an inquiry on the marketplace, the server fires `notifyLeadCaptured` immediately after persisting the lead. It fans out to every channel configured on that dealership's profile — all in parallel, all non-blocking (a channel outage never prevents the lead from being saved).

## Architecture

```
Marketplace form submit
  → POST /api/marketplace/vehicles/:id/leads
    → captureMarketplaceLead()         persists Lead row
      → notifyLeadCaptured()           persists DealerNotification row (PENDING)
        → fanoutLeadNotification()     fires all channels in parallel
          ├─ email          emailTransport.ts
          ├─ webhook        transports/webhookTransport.ts
          ├─ discord        transports/discordTransport.ts
          ├─ telegram       transports/telegramTransport.ts
          └─ sms            transports/smsTransport.ts
        → DealerNotification updated   SENT (any ok) | FAILED (all failed)
```

Channel config lives in `DealershipProfile.notificationChannels` (JSON). Dealers set it via the **Notification channels** panel on the Leads page, or directly via the API.

---

## Channels

### Email

Sends to `DealershipProfile.primaryContact.email`. No per-dealer config needed beyond having a valid primary contact email.

**Env vars (server-wide):**
```
SMTP_ENABLED=true
SMTP_HOST=smtp.sendgrid.net        # or any SMTP provider
SMTP_PORT=587
SMTP_USER=apikey                   # SendGrid: literal "apikey"
SMTP_PASS=SG.xxxx                  # your API key / password
SMTP_FROM=leads@yourdomain.com
```

Without `SMTP_ENABLED=true`, email writes to the mock outbox (`MOCK_OUTBOX_DIR`, default `./mock-outbox`). That's intentional for dev — JSON files appear there for each outbound message.

**Recommended providers:**
- SendGrid — free tier 100/day, SMTP relay is instant
- Resend — developer-friendly, good deliverability
- Postmark — best deliverability for transactional

**Per-dealer toggle:** The `email.enabled` field in `notificationChannels` defaults to `true`. Set `{ "email": { "enabled": false } }` to silence email for a specific dealer without touching SMTP config.

---

### Webhook

Dealer provides an HTTPS URL. On every lead, the server POSTs JSON:

```json
{
  "event": "lead.captured",
  "leadId": "...",
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

If a `secret` is configured, the request includes an `X-Dealer-Signature: sha256=<hmac>` header (HMAC-SHA256 of the raw body). Verify it on the receiving end to authenticate the request.

**Per-dealer config (set in UI or via API):**
```json
{
  "webhook": {
    "url": "https://your-endpoint.example.com/leads",
    "secret": "optional-signing-secret"
  }
}
```

**Quick test endpoint:** https://webhook.site — get a free unique URL, paste it in, and watch payloads arrive in the browser.

**Works out of the box with:** Zapier, Make (Integromat), n8n, Slack incoming webhooks, Discord webhooks, any custom backend.

**No server-side env vars required.**

---

### Discord

Dealer provides a Discord webhook URL. Leads arrive as a formatted embed in any channel.

**One-time setup per dealer:**

1. In Discord, go to the target channel → **Edit Channel** → **Integrations** → **Webhooks**
2. Click **New Webhook** → give it a name (e.g. "Lead Alerts") → **Copy Webhook URL**
3. Paste the URL into the Discord field in the Notifications panel

**Per-dealer config:**
```json
{
  "discord": {
    "webhookUrl": "https://discord.com/api/webhooks/1234567890/xxxx"
  }
}
```

**No server-side env vars required.**

**Sample embed the dealer receives:**
```
New lead — Stock #DM-2024-042
Dealer: Prairie Ridge Motors    Platform: consumer-marketplace
Name: Alex Johnson              Email: alex@example.com
Phone: +15551234567
Message: Is this still available?
Lead ID: clxxx...
```

---

### Telegram

Dealer runs a Telegram bot and receives messages in any chat (personal, group, or channel).

**One-time setup per dealer:**

1. Message `@BotFather` → `/newbot` → follow prompts → copy the bot token (`123456:ABC-...`)
2. Start a chat with your new bot (required before it can message you)
3. Get your chat ID: message `@userinfobot` in Telegram → copy the `id` field
   - For a group: add the bot to the group, then check `@userinfobot` from inside the group
   - For a channel: add the bot as admin, chat ID starts with `-100`

**Per-dealer config:**
```json
{
  "telegram": {
    "botToken": "123456:ABC-...",
    "chatId": "-100123456789"
  }
}
```

**No server-side env vars required** — the bot token lives in the dealer's profile.

**Sample message the dealer receives:**
```
New lead — Stock #DM-2024-042
Dealer: Prairie Ridge Motors
Platform: consumer-marketplace
Name: Alex Johnson
Email: alex@example.com
Phone: +15551234567

"Is this still available?"
```

---

### SMS (Twilio)

Sends a short SMS to a phone number configured per dealer.

**One-time server setup:**

1. Create a Twilio account at https://twilio.com
2. Buy a phone number (or use the free trial number)
3. Copy Account SID, Auth Token, and the phone number

**Env vars (server-wide):**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+15551234567
```

Without these vars, SMS falls back to `console.log` (mock mode). No errors, no crash — just a log line. This is intentional during dev when no Twilio account exists yet.

**Per-dealer config:**
```json
{
  "sms": {
    "phone": "+15552223333"
  }
}
```

Phone must be E.164 format (country code + number, no spaces, starts with `+`).

**Sample SMS the dealer receives:**
```
New lead from Alex Johnson for Stock #DM-2024-042. Log in to respond.
```

---

## API

### GET `/api/dealers/:dealershipId/notification-channels`

Returns the current channel config for a dealership.

```json
{
  "channels": {
    "email": { "enabled": true },
    "webhook": { "url": "https://...", "secret": "..." },
    "telegram": { "botToken": "...", "chatId": "..." },
    "sms": { "phone": "+1..." }
  }
}
```

### PATCH `/api/dealers/:dealershipId/notification-channels`

Replaces the full channel config. Send only the channels you want active — omit a channel to disable it.

```bash
curl -X PATCH https://your-api/api/dealers/DEALER_ID/notification-channels \
  -H "Content-Type: application/json" \
  -b "op_session=..." \
  -d '{
    "email": { "enabled": true },
    "webhook": { "url": "https://webhook.site/your-id" }
  }'
```

Validation rules applied server-side:
- `webhook.url` must start with `https://`
- `sms.phone` must start with `+`
- `telegram` requires both `botToken` and `chatId`

---

## Demo script

Fires all configured channels with a synthetic lead. No DB or running server needed.

```bash
# Webhook only
DEMO_WEBHOOK_URL=https://webhook.site/your-id \
  npx tsx src/scripts/demo/demoLeadNotification.ts

# All channels
DEMO_WEBHOOK_URL=https://webhook.site/your-id \
DEMO_WEBHOOK_SECRET=mysecret \
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... \
TELEGRAM_BOT_TOKEN=123456:ABC-... \
TELEGRAM_CHAT_ID=-100123456789 \
DEMO_SMS_PHONE=+15551234567 \
TWILIO_ACCOUNT_SID=ACxxx \
TWILIO_AUTH_TOKEN=xxx \
TWILIO_FROM_NUMBER=+15559999999 \
  npx tsx src/scripts/demo/demoLeadNotification.ts
```

Output:
```
✓ Webhook configured: https://webhook.site/your-id
✓ Telegram configured: chat -100123456789
✓ SMS configured: +15551234567 (mock — no Twilio creds)
✓ Email configured: demo-dealer@example.com (mock outbox in dev)

Firing notification to all configured channels...

  ✓ webhook
  ✓ telegram
  ✓ sms
  ✓ email

Done.
```

---

## Adding `.env.example` entries

Add these to `.env.example` alongside the existing SMTP block:

```
# ── Twilio SMS (optional) ─────────────────────────────────────────────────────
# Required to send real SMS lead alerts. Without these, SMS falls back to console.log.
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""              # E.164 format: +15551234567
```

Telegram credentials live per-dealer in the DB, not in env vars.

---

## Production checklist

- [ ] `SMTP_ENABLED=true` + all `SMTP_*` vars set
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` set
- [ ] At least one dealer has `notificationChannels` configured (via UI or PATCH API)
- [ ] Dealer's `primaryContact.email` is a real monitored address
- [ ] Webhook URL (if used) is HTTPS and responding 2xx to POST
- [ ] Telegram bot has been started (sent `/start` or any message to the bot before first lead)
