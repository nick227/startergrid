import type { PrismaClient } from '@prisma/client';
import { emailTransport } from './emailTransport.js';
import { sendSms } from './transports/smsTransport.js';
import type { AutoResponseConfig } from './notificationFanout.js';

export type BuyerAutoResponseParams = {
  leadId:      string;
  dealershipId: string;
  dealerName:  string;
  vehicleRef:  string;
  contact: {
    name?:  string | null;
    email?: string | null;
    phone?: string | null;
  };
  config: AutoResponseConfig;
};

type OutreachResult = { channel: string; ok: boolean; error?: string };

function buildEmailSubject(dealerName: string, vehicleRef: string): string {
  return `Thanks for your interest in the ${vehicleRef} — ${dealerName}`;
}

function buildEmailBody(params: BuyerAutoResponseParams): string {
  const { dealerName, vehicleRef, contact, config } = params;
  const greeting = contact.name ? `Hi ${contact.name},` : 'Hi,';

  if (config.emailTemplate?.trim()) {
    return config.emailTemplate
      .replace(/\{name\}/g, contact.name ?? '')
      .replace(/\{vehicle\}/g, vehicleRef)
      .replace(/\{dealer\}/g, dealerName);
  }

  return [
    greeting,
    '',
    `Thanks for reaching out about the ${vehicleRef}. We received your message and someone from our team will be in touch with you shortly.`,
    '',
    `${config.fromName ?? dealerName}`,
  ].join('\n');
}

function buildSmsBody(params: BuyerAutoResponseParams): string {
  const { dealerName, vehicleRef, contact, config } = params;
  const firstName = contact.name?.split(' ')[0];

  if (config.smsTemplate?.trim()) {
    return config.smsTemplate
      .replace(/\{name\}/g, firstName ?? '')
      .replace(/\{vehicle\}/g, vehicleRef)
      .replace(/\{dealer\}/g, config.fromName ?? dealerName);
  }

  const greeting = firstName ? `Hi ${firstName}, ` : '';
  return `${greeting}Thanks for inquiring about the ${vehicleRef}. We'll be in touch shortly. — ${config.fromName ?? dealerName}`;
}

export async function sendBuyerAutoResponse(
  prisma: PrismaClient,
  params: BuyerAutoResponseParams,
): Promise<OutreachResult[]> {
  const { leadId, dealershipId, contact, config } = params;

  if (!config.enabled) return [];

  const tasks: Promise<OutreachResult>[] = [];

  const emailEnabled = config.emailEnabled !== false;
  if (emailEnabled && contact.email) {
    const subject = buildEmailSubject(params.dealerName, params.vehicleRef);
    const body    = buildEmailBody(params);
    const preview = body.slice(0, 500);

    tasks.push(
      emailTransport({ to: contact.email, subject, body })
        .then(async (): Promise<OutreachResult> => {
          await prisma.buyerOutreach.create({
            data: { leadId, dealershipId, channel: 'email', recipientAddress: contact.email!, status: 'SENT', messagePreview: preview, sentAt: new Date() },
          });
          return { channel: 'email', ok: true };
        })
        .catch(async (err): Promise<OutreachResult> => {
          const errorMessage = String(err).slice(0, 500);
          await prisma.buyerOutreach.create({
            data: { leadId, dealershipId, channel: 'email', recipientAddress: contact.email!, status: 'FAILED', messagePreview: preview, errorMessage },
          });
          return { channel: 'email', ok: false, error: errorMessage };
        }),
    );
  }

  const smsEnabled = config.smsEnabled !== false;
  if (smsEnabled && contact.phone) {
    const body    = buildSmsBody(params);
    const preview = body.slice(0, 500);

    tasks.push(
      sendSms(contact.phone, body)
        .then(async (): Promise<OutreachResult> => {
          await prisma.buyerOutreach.create({
            data: { leadId, dealershipId, channel: 'sms', recipientAddress: contact.phone!, status: 'SENT', messagePreview: preview, sentAt: new Date() },
          });
          return { channel: 'sms', ok: true };
        })
        .catch(async (err): Promise<OutreachResult> => {
          const errorMessage = String(err).slice(0, 500);
          await prisma.buyerOutreach.create({
            data: { leadId, dealershipId, channel: 'sms', recipientAddress: contact.phone!, status: 'FAILED', messagePreview: preview, errorMessage },
          });
          return { channel: 'sms', ok: false, error: errorMessage };
        }),
    );
  }

  if (tasks.length === 0) return [];
  return Promise.all(tasks);
}
