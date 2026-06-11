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
  category?: string | null;
  deliveryDestinations?: LeadDeliveryDestination[];
  submittedAt?: Date;
};

const LISTING_FOR_LEAD_SELECT = {
  id:           true,
  dealershipId: true,
  stockNumber:  true,
  year:         true,
  make:         true,
  model:        true,
  trim:         true,
  priceCents:   true,
} as const;

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
  const listing = await prisma.vehicle.findFirst({
    where:  { id: listingId, soldAt: null, removedAt: null, priceCents: { gt: 0 } },
    select: LISTING_FOR_LEAD_SELECT,
  });
  if (!listing) return null;

  const leadId = await persistLead(prisma, listing.dealershipId, {
    source: 'PLATFORM_FORM',
    platformSlug: MARKETPLACE_PLATFORM_SLUG,
    vehicleId: listing.id,
    contactName:  contact.contactName  ?? null,
    contactEmail: contact.contactEmail ?? null,
    contactPhone: contact.contactPhone ?? null,
    message:      contact.message      ?? null,
    vehicleInterest: {
      listingId,
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
      stockNumber: listing.stockNumber,
    },
  );

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
          category: options.category ?? null,
          contactName: contact.contactName ?? null,
          contactEmail: contact.contactEmail ?? null,
          contactPhone: contact.contactPhone ?? null,
          message: contact.message ?? null,
          dealership: dealershipPayload,
          vehicle: vehiclePayload,
        },
      );
    }
  }

  await recordChannelEvent(prisma, {
    dealershipId:     listing.dealershipId,
    platformSlug:       MARKETPLACE_PLATFORM_SLUG,
    eventType:          'INQUIRY_SUBMITTED',
    sourceConfidence:   'OBSERVED_FIRST_PARTY',
    vehicleId:          listing.id,
    listingId,
    quantity:           1,
  });

  return { leadId, queuedDeliveryCount };
}
