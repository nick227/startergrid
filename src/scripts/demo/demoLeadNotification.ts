/**
 * Lead notification demo — fires all configured channels with a synthetic lead.
 *
 * Usage:
 *   npx tsx src/scripts/demo/demoLeadNotification.ts
 *
 * Configuration via env vars (set any you have; others will mock/skip):
 *   DEMO_WEBHOOK_URL      — e.g. https://webhook.site/<your-id>
 *   DEMO_WEBHOOK_SECRET   — optional HMAC signing secret
 *   DISCORD_WEBHOOK_URL   — https://discord.com/api/webhooks/...
 *   TELEGRAM_BOT_TOKEN    — from @BotFather
 *   TELEGRAM_CHAT_ID      — your chat ID (from @userinfobot)
 *   DEMO_SMS_PHONE        — E.164 phone number, e.g. +15551234567
 *   TWILIO_ACCOUNT_SID    — Twilio account SID
 *   TWILIO_AUTH_TOKEN     — Twilio auth token
 *   TWILIO_FROM_NUMBER    — Twilio phone number
 */

import { fanoutLeadNotification, type NotificationChannelsConfig } from '../../services/dealer/notificationFanout.js';

const channels: NotificationChannelsConfig = {};

if (process.env['DEMO_WEBHOOK_URL']) {
  channels.webhook = {
    url:    process.env['DEMO_WEBHOOK_URL'],
    secret: process.env['DEMO_WEBHOOK_SECRET'] || undefined,
  };
  console.log(`✓ Webhook configured: ${channels.webhook.url}`);
} else {
  console.log('  Webhook skipped — set DEMO_WEBHOOK_URL to enable (try https://webhook.site)');
}

if (process.env['DISCORD_WEBHOOK_URL']) {
  channels.discord = { webhookUrl: process.env['DISCORD_WEBHOOK_URL'] };
  console.log(`✓ Discord configured: ${channels.discord.webhookUrl}`);
} else {
  console.log('  Discord skipped — set DISCORD_WEBHOOK_URL to enable');
}

if (process.env['TELEGRAM_BOT_TOKEN'] && process.env['TELEGRAM_CHAT_ID']) {
  channels.telegram = {
    botToken: process.env['TELEGRAM_BOT_TOKEN'],
    chatId:   process.env['TELEGRAM_CHAT_ID'],
  };
  console.log(`✓ Telegram configured: chat ${channels.telegram.chatId}`);
} else {
  console.log('  Telegram skipped — set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID to enable');
}

if (process.env['DEMO_SMS_PHONE']) {
  channels.sms = { phone: process.env['DEMO_SMS_PHONE'] };
  if (process.env['TWILIO_ACCOUNT_SID']) {
    console.log(`✓ SMS configured: ${channels.sms.phone} (live Twilio)`);
  } else {
    console.log(`✓ SMS configured: ${channels.sms.phone} (mock — no Twilio creds)`);
  }
} else {
  console.log('  SMS skipped — set DEMO_SMS_PHONE to enable');
}

// Email is always included — in dev it writes to the mock outbox file.
channels.email = { enabled: true };
const demoEmail = 'demo-dealer@example.com';
console.log(`✓ Email configured: ${demoEmail} (mock outbox in dev)`);

const payload = {
  leadId:       'demo-lead-001',
  platformSlug: 'consumer-marketplace',
  dealerName:   'Demo Motors',
  vehicleRef:   'Stock #DM-2024-042',
  contact: {
    name:    'Alex Johnson',
    email:   'alex@example.com',
    phone:   '+15551234567',
    message: "Hi, I'm interested in this vehicle. Is it still available? Can we schedule a test drive?",
  },
};

console.log('\nFiring notification to all configured channels...\n');

const results = await fanoutLeadNotification(channels, demoEmail, payload);

if (results.length === 0) {
  console.log('No channels active — configure at least one env var above.');
} else {
  for (const r of results) {
    if (r.ok) {
      console.log(`  ✓ ${r.channel}`);
    } else {
      console.log(`  ✗ ${r.channel}: ${r.error}`);
    }
  }
}

console.log('\nDone.');
