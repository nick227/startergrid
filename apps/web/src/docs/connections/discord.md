---
title: Discord Lead Alerts
summary: How to create a Discord webhook and paste it into the Notification channels panel.
keywords: discord, webhook, channel, server, lead, alert, notification
updated: 2026-06-13
---

Discord delivers lead alerts as a formatted embed in any channel you choose. Setup takes under two minutes and requires no coding.

## Create the webhook

1. Open Discord and go to the server where alerts should appear.
2. Right-click the target channel → **Edit Channel**.
3. In the left sidebar, click **Integrations**.
4. Click **Webhooks** → **New Webhook**.
5. Give it a name (e.g. *Lead Alerts*) and optionally set an avatar.
6. Click **Copy Webhook URL**.

The URL starts with `https://discord.com/api/webhooks/`.

## Paste into the portal

1. Go to **Leads** → expand **Notification channels**.
2. Paste the URL into the **Discord → Webhook URL** field.
3. Click **Save channels**.

The next lead received will post a message to that channel.

## What the embed looks like

Each alert appears as a card with:

- Title: *New lead — Stock #DM-2024-042*
- Fields for dealer, platform, buyer name, email, phone, and message
- Timestamp and lead ID in the footer

## Changing the channel

Webhook URLs are tied to a specific channel. To switch channels, create a new webhook in the target channel, copy the new URL, and replace the old one in the panel.

## Removing Discord alerts

Clear the Webhook URL field and save.

See [Lead notification channels](doc:connections/lead-notifications) for a full channel comparison.
