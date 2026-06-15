import type { PrismaClient } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';

export function parseDesiredChannels(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
}

/** Platforms that support dealer auto-sync on inventory changes. */
export const AUTO_SYNC_CAPABLE_SLUGS = new Set(['consumer-marketplace']);

export function defaultAutoSyncReadyInventory(platformSlug: string): boolean {
  return platformSlug === 'consumer-marketplace';
}

/** Absent DB row means site-enabled (opt-out model). */
export function resolveSiteEnabled(
  platformSlug: string,
  siteAvailabilityBySlug: Map<string, boolean> | ReadonlyMap<string, boolean>,
): boolean {
  const stored = siteAvailabilityBySlug.get(platformSlug);
  return stored !== false;
}

export function resolveDealerPlatformEnabled(
  dealerEnabled: boolean | null | undefined,
  desiredChannels: string[],
  platformSlug: string,
): boolean {
  if (dealerEnabled === false) return false;
  if (dealerEnabled === true) return true;
  if (desiredChannels.length === 0) return false;
  return desiredChannels.includes(platformSlug);
}

export function resolveAutoSyncReadyInventory(
  platformSlug: string,
  autoSyncReadyInventory: boolean | null | undefined,
): boolean {
  if (!AUTO_SYNC_CAPABLE_SLUGS.has(platformSlug)) return true;
  if (autoSyncReadyInventory === true) return true;
  if (autoSyncReadyInventory === false) return false;
  return defaultAutoSyncReadyInventory(platformSlug);
}

export async function loadSiteAvailabilityMap(
  prisma: PrismaClient,
): Promise<Map<string, boolean>> {
  const rows = await prisma.platformSiteAvailability.findMany({
    select: { platformSlug: true, siteEnabled: true },
  });
  return new Map(rows.map(r => [r.platformSlug, r.siteEnabled]));
}

export async function setSitePlatformEnabled(
  prisma: PrismaClient,
  platformSlug: string,
  siteEnabled: boolean,
  actor: { id: string; email: string },
): Promise<{ platformSlug: string; siteEnabled: boolean }> {
  const known = platformProfiles.some(p => p.slug === platformSlug);
  if (!known) {
    throw Object.assign(new Error(`Unknown platform: ${platformSlug}`), { statusCode: 404 });
  }

  const row = await prisma.platformSiteAvailability.upsert({
    where: { platformSlug },
    update: { siteEnabled, updatedBy: actor.email },
    create: { platformSlug, siteEnabled, updatedBy: actor.email },
  });

  await prisma.adminAuditLog.create({
    data: {
      action: 'platform.site-availability',
      actorId: actor.id,
      actorEmail: actor.email,
      detail: { platformSlug, siteEnabled } as object,
    },
  });

  return { platformSlug: row.platformSlug, siteEnabled: row.siteEnabled };
}
