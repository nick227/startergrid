import type { PrismaClient } from '@prisma/client';
import { generateAdfXml } from '../publishing/feedGeneratorService.js';
import { HttpError } from '../dealership/httpError.js';
import { createHash } from 'node:crypto';
import { emailTransport, realEmailDeliveryEnabled } from '../dealer/emailTransport.js';

// SENT_TO_CRM_ADDRESS means a mail server accepted the ADF/XML email. StarterGrid has no
// signal that the CRM imported it, so there is deliberately no "imported" status.
export type LeadCrmDeliveryStatus = 'NOT_SENT' | 'SENDING' | 'SENT_TO_CRM_ADDRESS' | 'FAILED';

export type LeadCrmSendBlocker =
  | 'NO_CRM_ADDRESS'
  | 'CRM_ADDRESS_NOT_EMAIL'
  | 'EMAIL_NOT_CONFIGURED'
  | 'SEND_IN_PROGRESS';

export type LeadDeliveryAttemptDto = {
  id: string;
  destinationType: string;
  destinationLabel: string;
  destinationAddress: string;
  status: string;
  payloadFormat: string;
  attemptCount: number;
  lastAttemptAt: Date | null;
  deliveredAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
};

export type LeadCrmHandoffDetails = {
  leadId: string;
  deliveryStatus: LeadCrmDeliveryStatus;
  adfXmlPayload: string;
  /** The CRM lead email configured on the dealership's ADF/XML destination; never a fallback. */
  crmEndpoint: string | null;
  canSend: boolean;
  sendBlocker: LeadCrmSendBlocker | null;
  sendBlockerMessage: string | null;
  attempts: LeadDeliveryAttemptDto[];
  vehicle: {
    stockNumber: string;
    year?: number | null;
    make?: string | null;
    model?: string | null;
  } | null;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

type Env = Record<string, string | undefined>;

// A send normally finishes in seconds. A PENDING send older than this never recorded its
// outcome (for example the server restarted), so it is reported as failed and can be retried.
const SEND_IN_FLIGHT_MS = 2 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTERRUPTED_MESSAGE = 'The send did not finish, so StarterGrid cannot confirm the mail server received it.';

type AttemptRow = {
  status: string;
  destinationType: string;
  attemptCount: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
};

// Only rows written by sendLeadToCrm count. The marketplace planner also stores ADF/XML rows
// (attemptCount 0) that nothing has dispatched; they are not CRM sends.
export function isCrmSend(a: AttemptRow): boolean {
  return a.destinationType === 'ADF_XML_EMAIL' && a.attemptCount > 0;
}

function isInFlight(a: AttemptRow, now: Date): boolean {
  return a.status === 'PENDING' && now.getTime() - (a.lastAttemptAt ?? a.createdAt).getTime() < SEND_IN_FLIGHT_MS;
}

/** Delivery status from a lead's most recent CRM send (see isCrmSend). Shared with the attention list. */
export function crmDeliveryStatus(latest: AttemptRow | undefined, now: Date): LeadCrmDeliveryStatus {
  if (!latest) return 'NOT_SENT';
  if (latest.status === 'SENT') return 'SENT_TO_CRM_ADDRESS';
  if (latest.status === 'PENDING') return isInFlight(latest, now) ? 'SENDING' : 'FAILED';
  if (latest.status === 'FAILED') return 'FAILED';
  return 'NOT_SENT';
}

function sendBlocker(
  crmEndpoint: string | null,
  latest: AttemptRow | undefined,
  now: Date,
  env: Env,
): { blocker: LeadCrmSendBlocker; message: string } | null {
  if (!crmEndpoint) {
    return {
      blocker: 'NO_CRM_ADDRESS',
      message: 'No CRM lead email is set. Add the address your CRM vendor gave you on the ADF/XML Lead Routing destination, or copy the ADF/XML below.',
    };
  }
  if (!EMAIL_PATTERN.test(crmEndpoint)) {
    return {
      blocker: 'CRM_ADDRESS_NOT_EMAIL',
      message: `StarterGrid can only send to a CRM email address, and "${crmEndpoint}" is not one. Copy or download the ADF/XML instead.`,
    };
  }
  if (!realEmailDeliveryEnabled(env)) {
    return {
      blocker: 'EMAIL_NOT_CONFIGURED',
      message: 'Email sending is not set up on this StarterGrid server, so nothing can be sent. Copy or download the ADF/XML instead.',
    };
  }
  if (latest && isInFlight(latest, now)) {
    return { blocker: 'SEND_IN_PROGRESS', message: 'A send to your CRM is already in progress.' };
  }
  return null;
}

export async function getLeadCrmHandoffDetails(
  prisma: PrismaClient,
  dealershipId: string,
  leadId: string,
  env: Env = process.env,
): Promise<LeadCrmHandoffDetails> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, dealershipId },
    include: {
      dealership: true,
      vehicle: true,
      deliveryAttempts: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!lead) {
    throw new HttpError(404, `Lead ${leadId} not found for dealership ${dealershipId}`);
  }

  // Look for configured CRM ADF endpoint on the dealership
  const adfAccount = await prisma.platformAccount.findFirst({
    where: { dealershipId, platformSlug: 'adf-xml-lead-routing' },
    select: { accountId: true },
  });

  const crmEndpoint = adfAccount?.accountId?.trim() || null;

  // Retrieve existing ADF/XML payload or generate standard 1.0 artifact
  let adfXml = '';
  const existingAdfAttempt = lead.deliveryAttempts.find(
    a => a.payloadFormat === 'ADF_XML_1_0' && a.payloadBody && a.payloadBody.trim().length > 0,
  );

  if (existingAdfAttempt) {
    adfXml = existingAdfAttempt.payloadBody;
  } else {
    // Generate valid ADF/XML 1.0
    const vehiclePayload = lead.vehicle
      ? lead.vehicle
      : {
          id: 'unassigned',
          dealershipId,
          stockNumber: 'INQUIRY-DIRECT',
          year: 0,
          make: 'General',
          model: 'Inquiry',
          trim: null,
          vin: null,
          priceCents: 0,
          mileage: 0,
          condition: 'USED' as const,
        };

    const artifact = generateAdfXml({
      dealership: lead.dealership as any,
      vehicle: vehiclePayload,
      contactName: lead.contactName ?? undefined,
      contactEmail: lead.contactEmail ?? undefined,
      contactPhone: lead.contactPhone ?? undefined,
      message: lead.message ?? undefined,
    });
    adfXml = artifact.content;
  }

  const now = new Date();
  const crmSends = lead.deliveryAttempts.filter(isCrmSend);
  const latest = crmSends[0];
  const blocked = sendBlocker(crmEndpoint, latest, now, env);

  return {
    leadId: lead.id,
    deliveryStatus: crmDeliveryStatus(latest, now),
    adfXmlPayload: adfXml,
    crmEndpoint,
    canSend: blocked === null,
    sendBlocker: blocked?.blocker ?? null,
    sendBlockerMessage: blocked?.message ?? null,
    attempts: crmSends.map(a => ({
      id: a.id,
      destinationType: a.destinationType,
      destinationLabel: a.destinationLabel,
      destinationAddress: a.destinationAddress,
      status: a.status,
      payloadFormat: a.payloadFormat,
      attemptCount: a.attemptCount,
      lastAttemptAt: a.lastAttemptAt,
      deliveredAt: a.deliveredAt,
      errorMessage: a.status === 'PENDING' && !isInFlight(a, now) ? INTERRUPTED_MESSAGE : a.errorMessage,
      createdAt: a.createdAt,
    })),
    vehicle: lead.vehicle
      ? {
          stockNumber: lead.vehicle.stockNumber,
          year: lead.vehicle.year,
          make: lead.vehicle.make,
          model: lead.vehicle.model,
        }
      : null,
    customer: {
      name: lead.contactName,
      email: lead.contactEmail,
      phone: lead.contactPhone,
    },
  };
}

/**
 * Emails the lead's ADF/XML to the dealership's configured CRM address through the shared
 * email transport. An attempt is SENT only after the mail server accepts the message; any
 * transport error is stored on the attempt as FAILED and can be retried with another call.
 */
export async function sendLeadToCrm(
  prisma: PrismaClient,
  dealershipId: string,
  leadId: string,
  options: { env?: Env; send?: typeof emailTransport } = {},
): Promise<LeadCrmHandoffDetails> {
  const env = options.env ?? process.env;
  const send = options.send ?? emailTransport;
  const current = await getLeadCrmHandoffDetails(prisma, dealershipId, leadId, env);
  if (!current.canSend || !current.crmEndpoint) {
    throw new HttpError(409, current.sendBlockerMessage ?? 'This lead cannot be sent to a CRM right now.');
  }

  const now = new Date();
  // Close out sends that never recorded an outcome so they stop reading as in progress.
  await prisma.leadDeliveryAttempt.updateMany({
    where: {
      leadId,
      dealershipId,
      destinationType: 'ADF_XML_EMAIL',
      status: 'PENDING',
      attemptCount: { gt: 0 },
      lastAttemptAt: { lt: new Date(now.getTime() - SEND_IN_FLIGHT_MS) },
    },
    data: { status: 'FAILED', errorCode: 'SEND_INTERRUPTED', errorMessage: INTERRUPTED_MESSAGE },
  });

  const attempt = await prisma.leadDeliveryAttempt.create({
    data: {
      leadId,
      dealershipId,
      destinationType: 'ADF_XML_EMAIL',
      destinationLabel: 'Dealership CRM (ADF/XML 1.0)',
      destinationAddress: current.crmEndpoint,
      status: 'PENDING',
      payloadFormat: 'ADF_XML_1_0',
      payloadBody: current.adfXmlPayload,
      payloadChecksum: sha256(current.adfXmlPayload),
      attemptCount: 1,
      lastAttemptAt: now,
    },
  });

  const vehicle = current.vehicle
    ? [current.vehicle.year, current.vehicle.make, current.vehicle.model].filter(Boolean).join(' ') + ` #${current.vehicle.stockNumber}`
    : 'General inquiry';
  try {
    await send({ to: current.crmEndpoint, subject: `ADF lead: ${vehicle}`, body: current.adfXmlPayload }, env);
    await prisma.leadDeliveryAttempt.update({
      where: { id: attempt.id },
      data: { status: 'SENT', deliveredAt: new Date(), errorCode: null, errorMessage: null },
    });
  } catch (err) {
    const code = (err as { code?: unknown }).code;
    await prisma.leadDeliveryAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'FAILED',
        errorCode: (typeof code === 'string' ? code : 'EMAIL_SEND_FAILED').slice(0, 80),
        errorMessage: (err instanceof Error ? err.message : 'Email delivery failed').slice(0, 255),
      },
    });
  }

  return getLeadCrmHandoffDetails(prisma, dealershipId, leadId, env);
}
