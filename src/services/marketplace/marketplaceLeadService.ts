import { resolveListingIdentity, type ListingIdentity } from './listingIdentity.js';
import type { PrismaClient } from '@prisma/client';
import { MARKETPLACE_PLATFORM_SLUG } from '../channel/channelMetrics.js';
import { recordChannelEvent } from '../channel/channelEventService.js';
import { persistLead } from '../publishing/lifecyclePersistenceService.js';
import { notifyLeadCaptured } from '../dealer/dealerNotificationService.js';
import { planAndPersistMarketplaceLeadDeliveries } from '../leadDelivery/marketplaceLeadDelivery.js';
import type { LeadDeliveryDestination } from '../leadDelivery/leadDeliveryTypes.js';
import type { DealershipPayload, VehiclePayload } from '../../lib/types.js';

export { MARKETPLACE_PLATFORM_SLUG };

export type MarketplaceLeadContact = {
  contactName?:  string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  message?:      string | null;
};

export type CaptureMarketplaceLeadOptions = {
  source?: ListingIdentity['source'];
  category?: string | null;
  deliveryDestinations?: LeadDeliveryDestination[];
  submittedAt?: Date;
};

const DEALERSHIP_FOR_DELIVERY_SELECT = {
  legalName:      true,
  dbaName:        true,
  dealerLicense:  true,
  rooftopAddress: true,
  websiteUrl:     true,
  primaryContact: true,
  desiredChannels: true,
} as const;

export async function captureMarketplaceLead(
  prisma: PrismaClient,
  listingId: string,
  contact: MarketplaceLeadContact,
  options: CaptureMarketplaceLeadOptions = {},
): Promise<{ leadId: string; queuedDeliveryCount: number } | null> {
  const resolved = await resolveListingIdentity(prisma, options.source ?? 'vehicle', listingId, { published: true, categoryId: options.category ?? undefined });
  if (!resolved) return null;
  const { identity, item } = resolved;
  const isVehicle = identity.source === 'vehicle';
  const data = 'data' in item && item.data && typeof item.data === 'object' ? item.data as Record<string, unknown> : {};
  const listing = {
    id: item.id, dealershipId: item.dealershipId, stockNumber: item.stockNumber ?? item.id,
    priceCents: item.priceCents,
    year: 'year' in item ? item.year : null, make: 'make' in item ? item.make : null,
    model: 'model' in item ? item.model : null, trim: 'trim' in item ? item.trim : null,
  };

  const leadId = await persistLead(prisma, listing.dealershipId, {
    source: 'PLATFORM_FORM',
    platformSlug: MARKETPLACE_PLATFORM_SLUG,
    vehicleId: isVehicle ? listing.id : null,
    categoryItemId: isVehicle ? null : listing.id,
    contactName:  contact.contactName  ?? null,
    contactEmail: contact.contactEmail ?? null,
    contactPhone: contact.contactPhone ?? null,
    message:      contact.message      ?? null,
    vehicleInterest: {
      listingId,
      identity,
      title: typeof data.title === 'string' ? data.title : null,
      dealerId: listing.dealershipId,
      year:     listing.year,
      make:     listing.make,
      model:    listing.model,
      trim:     listing.trim,
      stockNumber: listing.stockNumber,
    },
  });

  // Lead acceptance is authoritative. Downstream email/CRM/DMS handoff must stay
  // non-blocking so a third-party outage never erases the buyer inquiry.
  await notifyLeadCaptured(
    prisma,
    listing.dealershipId,
    leadId,
    MARKETPLACE_PLATFORM_SLUG,
    {
      name:        contact.contactName  ?? undefined,
      email:       contact.contactEmail ?? undefined,
      phone:       contact.contactPhone ?? undefined,
      message:     contact.message      ?? undefined,
      stockNumber: listing.stockNumber,
    },
  ).catch(() => undefined);

  let queuedDeliveryCount = 0;
  const deliveryDestinations = options.deliveryDestinations ?? [];
  if (deliveryDestinations.length > 0) {
    const dealership = await prisma.dealershipProfile.findUnique({
      where: { id: listing.dealershipId },
      select: DEALERSHIP_FOR_DELIVERY_SELECT,
    });

    if (dealership) {
      const dealershipPayload: DealershipPayload = {
        legalName: dealership.legalName,
        dbaName: dealership.dbaName,
        dealerLicense: dealership.dealerLicense,
        rooftopAddress: dealership.rooftopAddress as DealershipPayload['rooftopAddress'],
        websiteUrl: dealership.websiteUrl,
        primaryContact: dealership.primaryContact as DealershipPayload['primaryContact'],
        desiredChannels: Array.isArray(dealership.desiredChannels)
          ? dealership.desiredChannels as string[]
          : [],
      };

      const vehiclePayload: VehiclePayload = {
        stockNumber: listing.stockNumber,
        year: listing.year,
        make: listing.make,
        model: listing.model,
        trim: listing.trim,
        priceCents: listing.priceCents,
      };

      queuedDeliveryCount = await planAndPersistMarketplaceLeadDeliveries(
        prisma as unknown as Parameters<typeof planAndPersistMarketplaceLeadDeliveries>[0],
        deliveryDestinations,
        {
          leadId,
          listingId,
          dealershipId: listing.dealershipId,
          platformSlug: MARKETPLACE_PLATFORM_SLUG,
          submittedAt: (options.submittedAt ?? new Date()).toISOString(),
          category: identity.categoryId,
          identity,
          categoryItem: !isVehicle ? { title: typeof data.title === 'string' ? data.title : listing.stockNumber } : undefined,
          contactName: contact.contactName ?? null,
          contactEmail: contact.contactEmail ?? null,
          contactPhone: contact.contactPhone ?? null,
          message: contact.message ?? null,
          dealership: dealershipPayload,
          vehicle: vehiclePayload,
        },
      ).catch(() => 0);
    }
  }

  await recordChannelEvent(prisma, {
    dealershipId:     listing.dealershipId,
    platformSlug:       MARKETPLACE_PLATFORM_SLUG,
    eventType:          'INQUIRY_SUBMITTED',
    sourceConfidence:   'OBSERVED_FIRST_PARTY',
    vehicleId:          isVehicle ? listing.id : null,
    metadataJson: { identity },
    listingId,
    quantity:           1,
  });

  return { leadId, queuedDeliveryCount };
}
