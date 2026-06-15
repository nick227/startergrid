import type { PrismaClient } from '@prisma/client';
import { isPlatformAllowedForCategory } from '../data/platformCategoryMap.js';
import { loadSiteAvailabilityMap, resolveSiteEnabled } from '../services/platform/platformAvailabilityService.js';

/** Dealer routes treat admin-disabled or out-of-category platforms as not found. */
export async function isDealerPlatformAccessible(
  prisma: PrismaClient,
  dealershipId: string,
  platformSlug: string,
): Promise<boolean> {
  const [siteAvailability, dealer] = await Promise.all([
    loadSiteAvailabilityMap(prisma),
    prisma.dealershipProfile.findUnique({
      where: { id: dealershipId },
      select: { businessCategory: true },
    }),
  ]);
  if (!resolveSiteEnabled(platformSlug, siteAvailability)) return false;
  return isPlatformAllowedForCategory(platformSlug, dealer?.businessCategory ?? null);
}
