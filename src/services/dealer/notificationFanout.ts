import { emailTransport } from './emailTransport.js';
import { sendWebhook }    from './transports/webhookTransport.js';
import { sendTelegram }   from './transports/telegramTransport.js';
import { sendSms }        from './transports/smsTransport.js';
import { sendDiscord }    from './transports/discordTransport.js';

export type AutoResponseConfig = {
  enabled:       boolean;
  emailEnabled?: boolean;
  smsEnabled?:   boolean;
  fromName?:     string;
  emailTemplate?: string;
  smsTemplate?:   string;
};

export type NotificationChannelsConfig = {
  email?:        { enabled?: boolean };
  webhook?:      { url: string; secret?: string };
  telegram?:     { botToken: string; chatId: string };
  sms?:          { phone: string };
  discord?:      { webhookUrl: string };
  autoResponse?: AutoResponseConfig;
};

export type LeadNotificationPayload = {
  leadId:       string;
  platformSlug: string;
  dealerName:   string;
  vehicleRef:   string;
  contact: {
    name?:    string | null;
    email?:   string | null;
    phone?:   string | null;
    message?: string | null;
  };
};

function buildEmailBody(payload: LeadNotificationPayload, dealerEmail: string): string {
  return [
    `A new lead was received for ${payload.dealerName}.`,
    '',
    `Platform: ${payload.platformSlug}`,
    `Vehicle:  ${payload.vehicleRef}`,
    payload.contact.name    ? `Name:     ${payload.contact.name}`    : null,
    payload.contact.email   ? `Email:    ${payload.contact.email}`   : null,
    payload.contact.phone   ? `Phone:    ${payload.contact.phone}`   : null,
    payload.contact.message ? `Message:  ${payload.contact.message}` : null,
    `Lead ID:  ${payload.leadId}`,
  ].filter(Boolean).join('\n');
}

function buildTelegramText(payload: LeadNotificationPayload): string {
  const lines = [
    `<b>New lead — ${payload.vehicleRef}</b>`,
    `Dealer: ${payload.dealerName}`,
    `Platform: ${payload.platformSlug}`,
    payload.contact.name    ? `Name: ${payload.contact.name}`       : null,
    payload.contact.email   ? `Email: ${payload.contact.email}`     : null,
    payload.contact.phone   ? `Phone: ${payload.contact.phone}`     : null,
    payload.contact.message ? `\n"${payload.contact.message}"`      : null,
  ];
  return lines.filter(Boolean).join('\n');
}

function buildSmsText(payload: LeadNotificationPayload): string {
  const who = payload.contact.name ?? payload.contact.email ?? payload.contact.phone ?? 'Anonymous';
  return `New lead from ${who} for ${payload.vehicleRef}. Log in to respond.`;
}

type ChannelResult = { channel: string; ok: boolean; error?: string };

export async function fanoutLeadNotification(
  channels: NotificationChannelsConfig,
  dealerEmail: string | null,
  payload: LeadNotificationPayload,
): Promise<ChannelResult[]> {
  const tasks: Promise<ChannelResult>[] = [];

  if (channels.email?.enabled !== false && dealerEmail) {
    const subject = `New lead — ${payload.vehicleRef} (${payload.platformSlug})`;
    tasks.push(
      emailTransport({
        to: dealerEmail,
        subject,
        body: buildEmailBody(payload, dealerEmail),
        payload,
      })
        .then((): ChannelResult => ({ channel: 'email', ok: true }))
        .catch((err): ChannelResult => ({ channel: 'email', ok: false, error: String(err) })),
    );
  }

  if (channels.webhook?.url) {
    tasks.push(
      sendWebhook(channels.webhook, { event: 'lead.captured', ...payload })
        .then((): ChannelResult => ({ channel: 'webhook', ok: true }))
        .catch((err): ChannelResult => ({ channel: 'webhook', ok: false, error: String(err) })),
    );
  }

  if (channels.telegram?.botToken && channels.telegram?.chatId) {
    tasks.push(
      sendTelegram(channels.telegram, buildTelegramText(payload))
        .then((): ChannelResult => ({ channel: 'telegram', ok: true }))
        .catch((err): ChannelResult => ({ channel: 'telegram', ok: false, error: String(err) })),
    );
  }

  if (channels.sms?.phone) {
    tasks.push(
      sendSms(channels.sms.phone, buildSmsText(payload))
        .then((): ChannelResult => ({ channel: 'sms', ok: true }))
        .catch((err): ChannelResult => ({ channel: 'sms', ok: false, error: String(err) })),
    );
  }

  if (channels.discord?.webhookUrl) {
    tasks.push(
      sendDiscord(channels.discord, {
        dealerName:   payload.dealerName,
        vehicleRef:   payload.vehicleRef,
        platformSlug: payload.platformSlug,
        leadId:       payload.leadId,
        contact:      payload.contact,
      })
        .then((): ChannelResult => ({ channel: 'discord', ok: true }))
        .catch((err): ChannelResult => ({ channel: 'discord', ok: false, error: String(err) })),
    );
  }

  if (tasks.length === 0) return [];
  return Promise.all(tasks);
}
