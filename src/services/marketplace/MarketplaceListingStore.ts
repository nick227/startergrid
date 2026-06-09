import type { PrismaClient } from '@prisma/client';
import type { MarketplaceListingRecord } from './marketplaceListingTypes.js';

export const MarketplaceListingStore = {
  async upsert(
    prisma: PrismaClient,
    dealershipId: string,
    vehicleId: string,
    platformSlug: string,
    patch: {
      externalListingId?: string;
      externalOfferId?: string;
      status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'FAILED';
      errorMessage?: string | null;
      listedAt?: Date | null;
      endedAt?: Date | null;
    }
  ): Promise<MarketplaceListingRecord> {
    return prisma.marketplaceListing.upsert({
      where: { vehicleId_platformSlug: { vehicleId, platformSlug } },
      create: { dealershipId, vehicleId, platformSlug, ...patch },
      update: patch,
    }) as Promise<MarketplaceListingRecord>;
  },

  async findByDealership(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug?: string
  ): Promise<MarketplaceListingRecord[]> {
    return prisma.marketplaceListing.findMany({
      where: { dealershipId, ...(platformSlug ? { platformSlug } : {}) },
      orderBy: { updatedAt: 'desc' },
    }) as Promise<MarketplaceListingRecord[]>;
  },

  async findOne(
    prisma: PrismaClient,
    vehicleId: string,
    platformSlug: string
  ): Promise<MarketplaceListingRecord | null> {
    return prisma.marketplaceListing.findUnique({
      where: { vehicleId_platformSlug: { vehicleId, platformSlug } },
    }) as Promise<MarketplaceListingRecord | null>;
  },

  async markEnded(
    prisma: PrismaClient,
    vehicleId: string,
    platformSlug: string
  ): Promise<void> {
    await prisma.marketplaceListing.updateMany({
      where: { vehicleId, platformSlug },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  },
};
