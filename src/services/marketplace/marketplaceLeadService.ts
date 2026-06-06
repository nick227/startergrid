import type { PrismaClient } from '@prisma/client';
import { MARKETPLACE_PLATFORM_SLUG } from '../channel/channelMetrics.js';
import { recordChannelEvent } from '../channel/channelEventService.js';
import { persistLead } from '../publishing/lifecyclePersistenceService.js';
import { notifyLeadCaptured } from '../dealer/dealerNotificationService.js';

export { MARKETPLACE_PLATFORM_SLUG };

export type MarketplaceLeadContact = {
  contactName?:  string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  message?:      string | null;
};

const LISTING_FOR_LEAD_SELECT = {
  id:           true,
  dealershipId: true,
  stockNumber:  true,
  year:         true,
  make:         true,
  model:        true,
  trim:         true,
} as const;

export async function captureMarketplaceLead(
  prisma: PrismaClient,
  listingId: string,
  contact: MarketplaceLeadContact,
): Promise<{ leadId: string } | null> {
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

  await recordChannelEvent(prisma, {
    dealershipId:     listing.dealershipId,
    platformSlug:       MARKETPLACE_PLATFORM_SLUG,
    eventType:          'INQUIRY_SUBMITTED',
    sourceConfidence:   'OBSERVED_FIRST_PARTY',
    vehicleId:          listing.id,
    listingId,
    quantity:           1,
  });

  return { leadId };
}
