---
title: Lead Notification Channels
summary: How to configure where lead alerts are delivered — email, Discord, Telegram, SMS, and webhook.
keywords: lead, notification, alert, discord, telegram, sms, webhook, email, channel
updated: 2026-06-13
---

When a buyer submits an inquiry through the marketplace, a notification fires immediately to every channel you have configured. Each channel is independent — a failure on one does not block the others.

## Available channels

| Channel | What you need | Who configures it |
| --- | --- | --- |
| Email | A valid primary contact email on your profile | You |
| Discord | A Discord server webhook URL | You |
| Telegram | A bot token and your chat ID | You |
| Webhook | Any HTTPS URL that accepts a POST | You |
| SMS | A phone number in E.164 format | You + admin (Twilio required) |

## Where to set it up

Open the **Leads** page and expand the **Notification channels** panel. Each channel has its own input section. Save after making changes — settings take effect on the next lead received.

## What a notification contains

All channels receive the same core data:

- Dealer name and vehicle reference (stock number)
- Platform source (e.g. Marketplace)
- Buyer's name, email, phone, and message (whichever fields they filled in)
- Lead ID for tracing

## Channel guides

[Discord](doc:connections/discord) — webhook setup in your server.

[Telegram](doc:connections/telegram) — bot creation and chat ID lookup.

[Email](doc:connections/email-notifications) — contact email and what the message looks like.

[Webhook](doc:connections/webhook) — payload shape and optional signature verification.

[SMS](doc:connections/sms) — phone format and admin-level Twilio requirement.
