import type { Prisma, PrismaClient } from '@prisma/client';
import { PUBLISHED_LISTING_GATE } from '../marketplace/marketplaceQueryService.js';

type Db = PrismaClient | Prisma.TransactionClient;

/** Read authoritative owned-channel data, never queue receipts or client-supplied evidence.
 * Works for manual publication as well as Autopilot. External destinations need their
 * own readback contract before they can satisfy this check.
 */
export async function readOnboardingEvidence(db: Db, dealershipId: string) {
  const vehicle = await db.vehicle.findFirst({
    where: {
      dealershipId, soldAt: null, removedAt: null, priceCents: { gt: 0 },
      ...PUBLISHED_LISTING_GATE,
      media: { some: {} },
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  // A persisted marketplace inquiry proves routing to this dealership's shared
  // inbox. It does not prove email/SMS/CRM delivery, which is a separate outcome.
  const lead = vehicle ? await db.lead.findFirst({
    where: {
      dealershipId, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM',
      vehicle: {
        dealershipId, soldAt: null, removedAt: null, priceCents: { gt: 0 },
        ...PUBLISHED_LISTING_GATE,
      },
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  }) : null;
  return { vehicleId: vehicle?.id ?? null, inboxLeadId: lead?.id ?? null };
}
