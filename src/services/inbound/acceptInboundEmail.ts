import type { Prisma, PrismaClient } from '@prisma/client';
import { notifyLeadCaptured } from '../dealer/dealerNotificationService.js';
import { persistLead } from '../publishing/lifecyclePersistenceService.js';
import { parseAdfFromEmail } from './adfParser.js';
import type { AdfProspect, AdfVehicle } from './adfParser.js';
import { evaluateProviderTrust } from './providerTrust.js';
import { routeTokenFromEmail } from './inboundRoute.js';
import { matchVehicle } from './vehicleMatcher.js';
import type { NormalizedInboundEmail } from './inboundEmailTypes.js';

const UNVERIFIED = 'adf-email-unverified';

export type AcceptedInboundEmail = { status: string; leadId: string | null; duplicate: boolean };

export async function acceptInboundEmail(db: PrismaClient, email: NormalizedInboundEmail): Promise<AcceptedInboundEmail> {
  const existing = await db.inboundEmailMessage.findUnique({
    where: { provider_providerMessageId: { provider: email.provider, providerMessageId: email.providerMessageId } },
    include: { lead: { select: { id: true } } },
  });
  if (existing) return { status: existing.status, leadId: existing.lead?.id ?? existing.duplicateOfLeadId, duplicate: true };

  const token = routeTokenFromEmail(email);
  const route = token
    ? await db.inboundEmailRoute.findUnique({ where: { routeToken: token }, select: { dealershipId: true, status: true } })
    : null;
  const dealershipId = route && route.status !== 'DISABLED' ? route.dealershipId : null;
  const message = await db.inboundEmailMessage.create({
    data: {
      provider: email.provider,
      providerMessageId: email.providerMessageId,
      rfcMessageId: email.rfcMessageId,
      dealershipId,
      routeToken: token,
      envelopeRecipient: (email.recipients[0] ?? '').slice(0, 255),
      fromEmail: email.from.email.slice(0, 255),
      subject: email.subject?.slice(0, 255) ?? null,
      receivedAt: email.receivedAt,
      provenance: { trust: 'UNKNOWN', reasons: [] } as Prisma.InputJsonValue,
      providerTrust: 'UNKNOWN',
      status: 'RECEIVED',
    },
  });
  if (!dealershipId) return finish(db, message.id, 'UNROUTED', 'UNKNOWN_ROUTE', null);

  try {
  const parsed = parseAdfFromEmail({ attachments: email.attachments, textBody: email.textBody, htmlBody: email.htmlBody });
  if (!parsed.ok) return finish(db, message.id, 'PARSE_FAILED', parsed.reason, null);
  const prospect = parsed.prospects[0];
  if (!prospect) return finish(db, message.id, 'PARSE_FAILED', 'NO_PROSPECT', null);

  const provenance = evaluateProviderTrust(parsed.prospects, { email: email.from.email, auth: email.auth });
  const prior = await duplicateLead(db, dealershipId, email.rfcMessageId);
  if (prior) return finish(db, message.id, 'DUPLICATE', null, prior, provenance);

  const vehicle = buyVehicle(prospect);
  const matched = await matchVehicle(db, dealershipId, vehicle);
  const leadId = await persistLead(db, dealershipId, {
    source: 'ADF_XML',
    platformSlug: provenance.verifiedPlatformSlug ?? UNVERIFIED,
    vehicleId: matched.vehicleId,
    contactName: prospect.contact.name,
    contactEmail: prospect.contact.email,
    contactPhone: prospect.contact.phone,
    message: prospect.comments,
    vehicleInterest: { vehicles: prospect.vehicles, requestDate: prospect.requestDate },
    inboundMessageId: message.id,
  });
  if (matched.suggestions.length) {
    await db.inboundLeadVehicleSuggestion.createMany({
      data: matched.suggestions.map(s => ({ leadId, vehicleId: s.vehicleId, basis: s.basis })),
      skipDuplicates: true,
    });
  }
  const status = provenance.trust === 'CONFLICTING' ? 'NEEDS_REVIEW' : 'LEAD_CREATED';
  await finish(db, message.id, status, null, null, provenance);
  await notifyLeadCaptured(db, dealershipId, leadId, provenance.verifiedPlatformSlug ?? UNVERIFIED, {
    name: prospect.contact.name, email: prospect.contact.email, phone: prospect.contact.phone, message: prospect.comments, stockNumber: vehicle.stock ?? undefined,
  });
  return { status, leadId, duplicate: false };
  } catch {
    return { status: 'RECEIVED', leadId: null, duplicate: false };
  }
}

function buyVehicle(prospect: AdfProspect): AdfVehicle {
  return prospect.vehicles.find(v => v.interest === 'buy') ?? prospect.vehicles[0] ?? { interest: null, status: null, year: null, make: null, model: null, trim: null, vin: null, stock: null, price: null, comments: null };
}

async function duplicateLead(db: PrismaClient, dealershipId: string, rfcMessageId: string | null): Promise<string | null> {
  if (!rfcMessageId) return null;
  const prior = await db.inboundEmailMessage.findFirst({
    where: { dealershipId, rfcMessageId, lead: { isNot: null } },
    select: { lead: { select: { id: true } } },
  });
  return prior?.lead?.id ?? null;
}

async function finish(db: PrismaClient, id: string, status: 'UNROUTED' | 'PARSE_FAILED' | 'DUPLICATE' | 'LEAD_CREATED' | 'NEEDS_REVIEW', failureReason: string | null, duplicateOfLeadId: string | null = null, provenance?: { trust: 'VERIFIED' | 'CLAIMED' | 'CONFLICTING' | 'UNKNOWN'; reasons: string[]; claimedPlatformSlug: string | null; verifiedPlatformSlug: string | null }): Promise<AcceptedInboundEmail> {
  await db.inboundEmailMessage.update({
    where: { id },
    data: {
      status, failureReason, duplicateOfLeadId,
      ...(provenance ? { providerTrust: provenance.trust, provenance: provenance as unknown as Prisma.InputJsonValue } : {}),
    },
  });
  return { status, leadId: duplicateOfLeadId, duplicate: status === 'DUPLICATE' };
}
