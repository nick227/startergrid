import type { PrismaClient, Prisma } from '@prisma/client';
import type { IntegrationClass, VehicleUpdateKind } from '../lib/types.js';
import { platformProfiles } from '../data/platformProfiles.js';

export type SyncMode = 'REAL_TIME' | 'SCHEDULED' | 'MANUAL' | 'APPROVAL_REQUIRED';
export type PublishQueueStatus = 'READY' | 'BLOCKED' | 'NEEDS_APPROVAL' | 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
export type PlatformAccountState = 'ACCOUNT_NEEDED' | 'CREDENTIALS_NEEDED' | 'PENDING_REVIEW' | 'ACTIVE' | 'BLOCKED' | 'PARTNER_REQUIRED' | 'SUSPENDED';

// ── Pure helpers — testable without DB ──────────────────────────────────────

export function defaultSyncMode(cls: IntegrationClass): SyncMode {
  switch (cls) {
    case 'OWNED':             return 'REAL_TIME';
    case 'FEEDABLE':          return 'SCHEDULED';
    case 'ASSISTED':          return 'APPROVAL_REQUIRED';
    case 'PARTNER_DEPENDENT': return 'MANUAL';
  }
}

export function resolveQueueStatus(
  mode: SyncMode,
  kind: VehicleUpdateKind,
  urgentRemoval: boolean
): PublishQueueStatus {
  const isUrgent = (kind === 'SOLD' || kind === 'REMOVED') && urgentRemoval;
  if (isUrgent) return 'READY';
  switch (mode) {
    case 'REAL_TIME':          return 'READY';
    case 'SCHEDULED':          return 'SCHEDULED';
    case 'APPROVAL_REQUIRED':  return 'NEEDS_APPROVAL';
    case 'MANUAL':             return 'BLOCKED';
  }
}

export function resolvePriority(kind: VehicleUpdateKind): number {
  if (kind === 'SOLD' || kind === 'REMOVED') return 1;  // urgent
  if (kind === 'PRICE_CHANGE')               return 3;
  if (kind === 'PHOTO_CHANGE')               return 5;
  return 7;
}

export function resolveScheduledFor(mode: SyncMode): Date | null {
  if (mode === 'SCHEDULED') {
    // Default: next daily batch (tomorrow at 09:00 UTC)
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(9, 0, 0, 0);
    return d;
  }
  return null;
}

export function resolveBlockReason(status: PublishQueueStatus, mode: SyncMode): string | null {
  if (status === 'BLOCKED') return 'Partner follow-up required before this change can be published.';
  if (status === 'NEEDS_APPROVAL') return 'Operator approval required before dispatch.';
  return null;
}

export function defaultAccountState(applicationStatus: string): PlatformAccountState {
  switch (applicationStatus) {
    case 'ACTIVE':                             return 'ACTIVE';
    case 'SUBMITTED':
    case 'PLATFORM_REVIEWING':
    case 'APPROVED':
    case 'FEED_TESTING':                       return 'PENDING_REVIEW';
    case 'PARTNER_REQUIRED':                   return 'PARTNER_REQUIRED';
    case 'DEALER_ACTION_NEEDED':               return 'CREDENTIALS_NEEDED';
    case 'REJECTED':                           return 'BLOCKED';
    default:                                   return 'ACCOUNT_NEEDED';
  }
}

// ── DB functions ─────────────────────────────────────────────────────────────

export async function upsertDefaultSyncPolicies(
  prisma: PrismaClient,
  dealershipId: string
): Promise<void> {
  await prisma.$transaction(
    platformProfiles.map(p =>
      prisma.syncPolicy.upsert({
        where: { dealershipId_platformSlug: { dealershipId, platformSlug: p.slug } },
        update: {},
        create: {
          dealershipId,
          platformSlug: p.slug,
          mode: defaultSyncMode(p.integrationClass) as any,
          urgentRemoval: true
        }
      })
    )
  );
}

export async function upsertDefaultPlatformAccounts(
  prisma: PrismaClient,
  dealershipId: string
): Promise<void> {
  const applications = await prisma.platformApplication.findMany({
    where: { dealershipId },
    include: { platform: { select: { slug: true } } }
  });

  const appBySlug = new Map(applications.map(a => [a.platform.slug, a.status]));

  await prisma.$transaction(
    platformProfiles.map(p => {
      const appStatus = appBySlug.get(p.slug) ?? 'NOT_STARTED';
      const state = defaultAccountState(appStatus) as any;
      return prisma.platformAccount.upsert({
        where: { dealershipId_platformSlug: { dealershipId, platformSlug: p.slug } },
        update: { state },
        create: { dealershipId, platformSlug: p.slug, state }
      });
    })
  );
}
