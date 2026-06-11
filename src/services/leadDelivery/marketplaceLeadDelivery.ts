import { createHash } from 'node:crypto';
import { generateAdfXml } from '../publishing/feedGeneratorService.js';
import { persistPlannedLeadDeliveries } from './leadDeliveryAttemptStore.js';
import type {
  LeadDeliveryDestination,
  MarketplaceLeadDeliveryContext,
  PlannedLeadDeliveryAttempt,
} from './leadDeliveryTypes.js';

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function buildMarketplaceLeadWebhookPayload(context: MarketplaceLeadDeliveryContext): Record<string, unknown> {
  return {
    leadId: context.leadId,
    source: {
      platformSlug: context.platformSlug,
      submittedAt: context.submittedAt,
      category: context.category ?? null,
    },
    buyer: {
      contactName: context.contactName ?? null,
      contactEmail: context.contactEmail ?? null,
      contactPhone: context.contactPhone ?? null,
      message: context.message ?? null,
    },
    listing: {
      listingId: context.listingId,
      stockNumber: context.vehicle.stockNumber,
      year: context.vehicle.year ?? null,
      make: context.vehicle.make ?? null,
      model: context.vehicle.model ?? null,
      trim: context.vehicle.trim ?? null,
      priceCents: context.vehicle.priceCents ?? null,
    },
    dealer: {
      dealershipId: context.dealershipId,
      name: context.dealership.dbaName ?? context.dealership.legalName,
      websiteUrl: context.dealership.websiteUrl ?? null,
      rooftopAddress: context.dealership.rooftopAddress,
    },
  };
}

function buildEmailSummary(context: MarketplaceLeadDeliveryContext): string {
  const vehicleLabel = [
    context.vehicle.year,
    context.vehicle.make,
    context.vehicle.model,
    context.vehicle.trim,
  ].filter(Boolean).join(' ') || `Stock #${context.vehicle.stockNumber}`;

  return [
    'Marketplace lead received',
    `Lead ID: ${context.leadId}`,
    `Submitted At: ${context.submittedAt}`,
    `Source: ${context.platformSlug}`,
    `Listing ID: ${context.listingId}`,
    `Dealer ID: ${context.dealershipId}`,
    `Vehicle: ${vehicleLabel}`,
    `Stock Number: ${context.vehicle.stockNumber}`,
    context.contactName ? `Buyer Name: ${context.contactName}` : null,
    context.contactEmail ? `Buyer Email: ${context.contactEmail}` : null,
    context.contactPhone ? `Buyer Phone: ${context.contactPhone}` : null,
    context.message ? `Message: ${context.message}` : null,
  ].filter(Boolean).join('\n');
}

function buildAttempt(
  destination: LeadDeliveryDestination,
  context: MarketplaceLeadDeliveryContext,
): PlannedLeadDeliveryAttempt {
  switch (destination.destinationType) {
    case 'EMAIL':
      if (!destination.email?.trim()) {
        throw new Error(`Lead delivery destination ${destination.destinationId} is missing email`);
      }
      return {
        destinationId: destination.destinationId,
        destinationType: destination.destinationType,
        destinationLabel: destination.label,
        dealershipId: context.dealershipId,
        leadId: context.leadId,
        status: 'PENDING',
        payloadFormat: 'EMAIL_SUMMARY',
        payloadBody: buildEmailSummary(context),
        payloadChecksum: sha256(buildEmailSummary(context)),
        destinationAddress: destination.email.trim(),
      };
    case 'ADF_XML_EMAIL': {
      if (!destination.email?.trim()) {
        throw new Error(`Lead delivery destination ${destination.destinationId} is missing email`);
      }
      const artifact = generateAdfXml({
        dealership: context.dealership,
        vehicle: context.vehicle,
        contactName: context.contactName ?? undefined,
        contactEmail: context.contactEmail ?? undefined,
        contactPhone: context.contactPhone ?? undefined,
        message: context.message ?? undefined,
      });
      return {
        destinationId: destination.destinationId,
        destinationType: destination.destinationType,
        destinationLabel: destination.label,
        dealershipId: context.dealershipId,
        leadId: context.leadId,
        status: 'PENDING',
        payloadFormat: 'ADF_XML_1_0',
        payloadBody: artifact.content,
        payloadChecksum: sha256(artifact.content),
        destinationAddress: destination.email.trim(),
      };
    }
    case 'JSON_WEBHOOK': {
      if (!destination.webhookUrl?.trim()) {
        throw new Error(`Lead delivery destination ${destination.destinationId} is missing webhookUrl`);
      }
      const serialized = JSON.stringify(buildMarketplaceLeadWebhookPayload(context));
      return {
        destinationId: destination.destinationId,
        destinationType: destination.destinationType,
        destinationLabel: destination.label,
        dealershipId: context.dealershipId,
        leadId: context.leadId,
        status: 'PENDING',
        payloadFormat: 'MARKETPLACE_LEAD_JSON_V1',
        payloadBody: serialized,
        payloadChecksum: sha256(serialized),
        destinationAddress: destination.webhookUrl.trim(),
      };
    }
  }
}

export function planMarketplaceLeadDeliveries(
  destinations: LeadDeliveryDestination[],
  context: MarketplaceLeadDeliveryContext,
): PlannedLeadDeliveryAttempt[] {
  return destinations
    .filter(destination => destination.enabled && destination.dealershipId === context.dealershipId)
    .map(destination => buildAttempt(destination, context));
}

export async function planAndPersistMarketplaceLeadDeliveries(
  prisma: { leadDeliveryAttempt?: { createMany(args: { data: Array<Record<string, unknown>> }): Promise<{ count: number }> } },
  destinations: LeadDeliveryDestination[],
  context: MarketplaceLeadDeliveryContext,
): Promise<number> {
  const attempts = planMarketplaceLeadDeliveries(destinations, context);
  return persistPlannedLeadDeliveries(prisma, attempts);
}
