import type { PrismaClient, Prisma } from '@prisma/client';

export type CatalogSyncConfig = {
  id: string;
  dealershipId: string;
  platformSlug: string;
  catalogId: string;
  metadataJson: Prisma.JsonValue | null;
  lastSyncAt: Date | null;
  lastSyncCount: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export const CatalogSyncStore = {
  async upsertConfig(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug: string,
    catalogId: string,
    metadataJson?: Record<string, unknown>,
  ): Promise<CatalogSyncConfig> {
    return prisma.platformCatalogSync.upsert({
      where: { dealershipId_platformSlug: { dealershipId, platformSlug } },
      create: {
        dealershipId,
        platformSlug,
        catalogId,
        metadataJson: metadataJson !== undefined
          ? metadataJson as unknown as Prisma.InputJsonValue
          : undefined,
      },
      update: {
        catalogId,
        ...(metadataJson !== undefined
          ? { metadataJson: metadataJson as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
  },

  async getConfig(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug: string,
  ): Promise<CatalogSyncConfig | null> {
    return prisma.platformCatalogSync.findUnique({
      where: { dealershipId_platformSlug: { dealershipId, platformSlug } },
    });
  },

  async markSynced(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug: string,
    vehicleCount: number,
  ): Promise<void> {
    await prisma.platformCatalogSync.update({
      where: { dealershipId_platformSlug: { dealershipId, platformSlug } },
      data: { lastSyncAt: new Date(), lastSyncCount: vehicleCount },
    });
  },

  async deleteConfig(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug: string,
  ): Promise<void> {
    await prisma.platformCatalogSync.delete({
      where: { dealershipId_platformSlug: { dealershipId, platformSlug } },
    }).catch(() => {});
  },
};
