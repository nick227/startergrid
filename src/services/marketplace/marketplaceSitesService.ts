import type { PrismaClient } from '@prisma/client';
import {
  categoryIdToSlug,
  listMarketplaceCategories,
  resolveCategorySchema,
} from '../../../packages/category-schemas/src/index.js';
import {
  marketplaceSiteHref,
  resolveMarketplaceSiteStatus,
  type MarketplaceSiteStatus,
} from './marketplaceCategory.js';

export type MarketplaceSiteSummary = {
  category: string;
  slug: string;
  label: string;
  status: MarketplaceSiteStatus;
  listingCount: number;
  href: string;
  tagline: string;
};

export type MarketplaceSitesResponse = {
  sites: MarketplaceSiteSummary[];
};

const ELIGIBLE_VEHICLE_WHERE = {
  soldAt: null,
  removedAt: null,
  priceCents: { gt: 0 },
} as const;

async function countEligibleByCategory(
  prisma: PrismaClient,
): Promise<Map<string, number>> {
  const rows = await prisma.vehicle.groupBy({
    by: ['dealershipId'],
    where: ELIGIBLE_VEHICLE_WHERE,
    _count: { _all: true },
  });

  if (rows.length === 0) return new Map();

  const dealerIds = rows.map(row => row.dealershipId);
  const dealers = await prisma.dealershipProfile.findMany({
    where: { id: { in: dealerIds } },
    select: { id: true, businessCategory: true },
  });

  const categoryByDealer = new Map(dealers.map(d => [d.id, d.businessCategory]));
  const counts = new Map<string, number>();

  for (const row of rows) {
    const category = categoryByDealer.get(row.dealershipId);
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + row._count._all);
  }

  return counts;
}

export async function listMarketplaceSites(
  prisma: PrismaClient,
): Promise<MarketplaceSitesResponse> {
  const counts = await countEligibleByCategory(prisma);

  const sites = listMarketplaceCategories().map(schema => {
    const listingCount = counts.get(schema.id) ?? 0;
    const slug = categoryIdToSlug(schema.id);
    const status = resolveMarketplaceSiteStatus(schema.marketplace.consumerEnabled, listingCount);

    return {
      category: schema.id,
      slug,
      label: schema.label,
      status,
      listingCount,
      href: marketplaceSiteHref(slug),
      tagline: schema.marketplace.tagline,
    };
  });

  return { sites };
}

export async function getVehicleBusinessCategory(
  prisma: PrismaClient,
  listingId: string,
): Promise<string | null> {
  const row = await prisma.vehicle.findFirst({
    where: { id: listingId, ...ELIGIBLE_VEHICLE_WHERE },
    select: { dealership: { select: { businessCategory: true } } },
  });
  return row?.dealership.businessCategory ?? null;
}

export async function getDealerBusinessCategory(
  prisma: PrismaClient,
  dealerId: string,
): Promise<string | null> {
  const dealer = await prisma.dealershipProfile.findUnique({
    where: { id: dealerId },
    select: { businessCategory: true },
  });
  return dealer?.businessCategory ?? null;
}

export function categoryLabel(category: string): string {
  return resolveCategorySchema(category).label;
}
