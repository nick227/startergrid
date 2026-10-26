import type { Prisma, PrismaClient } from '@prisma/client';
import { platformSlugsForCategory } from '../../data/platformCategoryMap.js';

type Db = PrismaClient | Prisma.TransactionClient;

export type ChannelSetupStatus = { ready: boolean; missing: string[] };

/**
 * Default channel setup is complete when every destination for the dealership's
 * category has both an account row and a sync policy. Derived from data, so a
 * successful retry (or any later provisioning run) clears it without bookkeeping.
 */
export async function channelSetupStatus(db: Db, dealershipId: string): Promise<ChannelSetupStatus> {
  const dealer = await db.dealershipProfile.findUnique({ where: { id: dealershipId }, select: { businessCategory: true } });
  const expected = platformSlugsForCategory(dealer?.businessCategory ?? null);
  if (expected.length === 0) return { ready: true, missing: [] };
  const [accounts, policies] = await Promise.all([
    db.platformAccount.findMany({ where: { dealershipId }, select: { platformSlug: true } }),
    db.syncPolicy.findMany({ where: { dealershipId }, select: { platformSlug: true } }),
  ]);
  const haveAccount = new Set(accounts.map(a => a.platformSlug));
  const havePolicy = new Set(policies.map(p => p.platformSlug));
  const missing = expected.filter(slug => !haveAccount.has(slug) || !havePolicy.has(slug));
  return { ready: missing.length === 0, missing };
}
