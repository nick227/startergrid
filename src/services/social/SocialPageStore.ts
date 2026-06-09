import type { PrismaClient, SocialPageAccount } from '@prisma/client';
import type { FacebookPageInfo } from './FacebookGraphClient.js';

// Public summary — no access token exposed to callers outside this module.
export type SocialPageSummary = {
  id: string;
  pageId: string;
  name: string;
  pictureUrl: string | null;
  category: string | null;
  isSelected: boolean;
};

export const SocialPageStore = {
  // Upserts pages returned by /me/accounts into SocialPageAccount rows.
  // Preserves existing isSelected state; does not auto-select.
  async syncPages(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug: string,
    pages: FacebookPageInfo[],
  ): Promise<void> {
    for (const page of pages) {
      await prisma.socialPageAccount.upsert({
        where: { dealershipId_platformSlug_pageId: { dealershipId, platformSlug, pageId: page.id } },
        create: {
          dealershipId,
          platformSlug,
          pageId: page.id,
          name: page.name,
          pictureUrl: page.pictureUrl ?? null,
          category: page.category ?? null,
          pageAccessToken: page.accessToken,
          isSelected: false,
        },
        update: {
          name: page.name,
          pictureUrl: page.pictureUrl ?? null,
          category: page.category ?? null,
          pageAccessToken: page.accessToken,
        },
      });
    }
  },

  async listPages(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug: string,
  ): Promise<SocialPageSummary[]> {
    const rows = await prisma.socialPageAccount.findMany({
      where: { dealershipId, platformSlug },
      select: { id: true, pageId: true, name: true, pictureUrl: true, category: true, isSelected: true },
      orderBy: [{ isSelected: 'desc' }, { name: 'asc' }],
    });
    return rows;
  },

  // Atomically selects one page and clears all others for this dealer+slug.
  async selectPage(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug: string,
    pageId: string,
  ): Promise<void> {
    const target = await prisma.socialPageAccount.findUnique({
      where: { dealershipId_platformSlug_pageId: { dealershipId, platformSlug, pageId } },
      select: { id: true },
    });
    if (!target) throw new Error(`Page ${pageId} not found for ${platformSlug} — sync pages first`);

    await prisma.$transaction([
      prisma.socialPageAccount.updateMany({
        where: { dealershipId, platformSlug, isSelected: true },
        data: { isSelected: false },
      }),
      prisma.socialPageAccount.update({
        where: { id: target.id },
        data: { isSelected: true },
      }),
    ]);
  },

  // Returns the full row including token — internal use only (routes/services, not API responses).
  async getSelectedPage(
    prisma: PrismaClient,
    dealershipId: string,
    platformSlug: string,
  ): Promise<SocialPageAccount | null> {
    return prisma.socialPageAccount.findFirst({
      where: { dealershipId, platformSlug, isSelected: true },
    });
  },
};
