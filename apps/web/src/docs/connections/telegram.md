---
title: Telegram Lead Alerts
summary: How to create a Telegram bot, find your chat ID, and connect it to lead notifications.
keywords: telegram, bot, botfather, chat id, notification, lead, alert
updated: 2026-06-13
---

Telegram delivers lead alerts as a text message to any personal chat, group, or channel. You own the bot — it lives in your Telegram account, not ours.

## Step 1 — Create a bot

1. Open Telegram and search for **@BotFather**.
2. Send `/newbot`.
3. Choose a display name (e.g. *Prairie Ridge Leads*).
4. Choose a username ending in `bot` (e.g. *PrairieRidgeLeadsBot*).
5. BotFather replies with your **bot token** — a string like `7123456789:AAH-...`

Keep this token private. Anyone who has it can send messages as your bot.

## Step 2 — Find your chat ID

**Personal chat:**
1. Search Telegram for **@userinfobot**.
2. Send it any message.
3. It replies with your numeric user ID — that is your chat ID.

**Group:**
1. Add your new bot to the group.
2. Send any message in the group.
3. Message **@userinfobot** from inside the group — it reports the group ID (starts with `-`).

**Channel:**
1. Add the bot as an administrator of the channel.
2. The channel ID starts with `-100` followed by digits. You can find it by forwarding a channel post to **@userinfobot**.

## Step 3 — Start the bot

Send `/start` or any message directly to your bot before it can message you back. This is required the first time.

## Step 4 — Paste into the portal

1. Go to **Leads** → expand **Notification channels**.
2. Enter the **Bot token** and **Chat ID**.
3. Click **Save channels**.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| No message arrives | Bot was never started — send it any message first |
| *Chat not found* error | Chat ID is wrong or bot is not a member of the group/channel |
| Token rejected | Token was revoked via BotFather — generate a new one with `/token` |

To revoke a compromised token: message **@BotFather** → `/mybots` → select the bot → **API Token** → **Revoke current token**.

See [Lead notification channels](doc:connections/lead-notifications) for a full channel comparison.
