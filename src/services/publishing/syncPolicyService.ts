import type { PrismaClient, Prisma } from '@prisma/client';
import type { IntegrationClass, VehicleUpdateKind } from '../../lib/types.js';
import { platformsForCategory } from '../../data/platformCategoryMap.js';

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

// ── Cooldown helpers ─────────────────────────────────────────────────────────

/** Default minimum dispatch interval (minutes) by integration class. */
export function defaultMinIntervalMinutes(cls: IntegrationClass): number | null {
  switch (cls) {
    case 'OWNED':              return 0;     // real-time OK
    case 'FEEDABLE':           return 60;    // max once per hour
    case 'ASSISTED':           return 1440;  // max once per day (manual anyway)
    case 'PARTNER_DEPENDENT':  return null;  // no rule until agreement in place
  }
}

/**
 * Returns true if the platform is within its cooldown window and should not
 * receive a new dispatch right now.
 * Urgent removals (SOLD/REMOVED) bypass cooldown regardless of this result.
 */
export function isInCooldown(
  policy: { minIntervalMinutes: number | null; lastDispatchedAt: Date | null } | null | undefined,
  now: Date
): boolean {
  if (!policy?.minIntervalMinutes || !policy.lastDispatchedAt) return false;
  const elapsedMs = now.getTime() - policy.lastDispatchedAt.getTime();
  return elapsedMs < policy.minIntervalMinutes * 60_000;
}

/** Remaining cooldown seconds, or 0 if not in cooldown. */
export function cooldownRemainingSeconds(
  policy: { minIntervalMinutes: number | null; lastDispatchedAt: Date | null } | null | undefined,
  now: Date
): number {
  if (!policy?.minIntervalMinutes || !policy.lastDispatchedAt) return 0;
  const cooldownMs = policy.minIntervalMinutes * 60_000;
  const elapsedMs  = now.getTime() - policy.lastDispatchedAt.getTime();
  return Math.max(0, Math.ceil((cooldownMs - elapsedMs) / 1000));
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

// Platforms outside the dealer's business category get no default rows —
// over-seeding them is how auto dealers ended up with boat/RV/resale accounts.
async function categoryProfiles(prisma: PrismaClient, dealershipId: string) {
  const dealer = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { businessCategory: true },
  });
  // Fail closed: a missing dealer resolves to zero platforms, never the full
  // registry. Over-seeding is how auto dealers ended up with boat/RV accounts.
  return platformsForCategory(dealer?.businessCategory ?? null);
}

export async function upsertDefaultSyncPolicies(
  prisma: PrismaClient,
  dealershipId: string
): Promise<void> {
  const profiles = await categoryProfiles(prisma, dealershipId);
  await prisma.$transaction(
    profiles.map(p =>
      prisma.syncPolicy.upsert({
        where: { dealershipId_platformSlug: { dealershipId, platformSlug: p.slug } },
        update: { minIntervalMinutes: defaultMinIntervalMinutes(p.integrationClass) },
        create: {
          dealershipId,
          platformSlug: p.slug,
          mode: defaultSyncMode(p.integrationClass) as any,
          urgentRemoval: true,
          minIntervalMinutes: defaultMinIntervalMinutes(p.integrationClass),
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
  const profiles = await categoryProfiles(prisma, dealershipId);

  await prisma.$transaction(
    profiles.map(p => {
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
