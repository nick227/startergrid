import type { PrismaClient } from '@prisma/client';
import type { MarketplaceListingRecord } from './marketplaceListingTypes.js';
import { isPlatformAllowedForCategory } from '../../data/platformCategoryMap.js';

export type ItemRef =
  | { vehicleId: string }
  | { categoryItemId: string };

function isVehicleRef(ref: ItemRef): ref is { vehicleId: string } {
  return 'vehicleId' in ref;
}

type UpsertPatch = {
  externalListingId?: string;
  externalOfferId?: string;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'FAILED';
  errorMessage?: string | null;
  listedAt?: Date | null;
  endedAt?: Date | null;
};

export const MarketplaceListingStore = {
  async upsert(
    prisma: PrismaClient,
    dealershipId: string,
    itemRef: ItemRef,
    platformSlug: string,
    patch: UpsertPatch,
  ): Promise<MarketplaceListingRecord> {
    const dealer = await prisma.dealershipProfile.findUnique({
      where: { id: dealershipId },
      select: { businessCategory: true },
    });
    if (!isPlatformAllowedForCategory(platformSlug, dealer?.businessCategory ?? null)) {
      throw new Error(
        `Cross-category write rejected: platform '${platformSlug}' is not permitted for category '${dealer?.businessCategory ?? 'unknown'}'`,
      );
    }
    if (isVehicleRef(itemRef)) {
      const { vehicleId } = itemRef;
      return prisma.marketplaceListing.upsert({
        where: { vehicleId_platformSlug: { vehicleId, platformSlug } },
        create: { dealershipId, vehicleId, platformSlug, ...patch },
        update: patch,
      }) as Promise<MarketplaceListingRecord>;
    } else {
      const { categoryItemId } = itemRef;
      return prisma.marketplaceListing.upsert({
        where: { categoryItemId_platformSlug: { categoryItemId, platformSlug } },
        create: { dealershipId, categoryItemId, platformSlug, ...patch },
        update: patch,
      }) as Promise<MarketplaceListingRecord>;
    }
  },

  async findByDealership(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug?: string,
  ): Promise<MarketplaceListingRecord[]> {
    return prisma.marketplaceListing.findMany({
      where: { dealershipId, ...(platformSlug ? { platformSlug } : {}) },
      orderBy: { updatedAt: 'desc' },
    }) as Promise<MarketplaceListingRecord[]>;
  },

  async findOneByItem(
    prisma: PrismaClient,
    itemRef: ItemRef,
    platformSlug: string,
  ): Promise<MarketplaceListingRecord | null> {
    if (isVehicleRef(itemRef)) {
      return prisma.marketplaceListing.findUnique({
        where: { vehicleId_platformSlug: { vehicleId: itemRef.vehicleId, platformSlug } },
      }) as Promise<MarketplaceListingRecord | null>;
    } else {
      return prisma.marketplaceListing.findUnique({
        where: { categoryItemId_platformSlug: { categoryItemId: itemRef.categoryItemId, platformSlug } },
      }) as Promise<MarketplaceListingRecord | null>;
    }
  },

  async markEndedByItem(
    prisma: PrismaClient,
    itemRef: ItemRef,
    platformSlug: string,
  ): Promise<void> {
    if (isVehicleRef(itemRef)) {
      await prisma.marketplaceListing.updateMany({
        where: { vehicleId: itemRef.vehicleId, platformSlug },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    } else {
      await prisma.marketplaceListing.updateMany({
        where: { categoryItemId: itemRef.categoryItemId, platformSlug },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    }
  },

};
