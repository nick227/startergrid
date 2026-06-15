import type { PrismaClient, Prisma } from '@prisma/client';
import type { IntegrationClass, VehicleUpdateKind, VehicleUpdatePropagation } from '../../lib/types.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { isPlatformAllowedForCategory } from '../../data/platformCategoryMap.js';
import {
  defaultSyncMode,
  resolveQueueStatus,
  resolvePriority,
  resolveScheduledFor,
  resolveBlockReason,
  type SyncMode
} from './syncPolicyService.js';
import { recordSyncEvent } from './syncEventService.js';
import {
  ineligibleReasonForQueueItem,
  isAutoSyncEnabledForPlatform,
  isQueueItemOutboundEligible,
  parseDesiredChannels,
  vehicleChannelKey,
} from './queueEligibilityService.js';
import { loadSiteAvailabilityMap, resolveSiteEnabled } from '../platform/platformAvailabilityService.js';

export type QueueItemView = {
  id: string;
  assetRef: string | null;
  assetTitle: string | null;
  assetId: string | null;
  platformSlug: string;
  platformName: string;
  integrationClass: IntegrationClass;
  triggerKind: string;
  status: string;
  policyMode: string;
  priority: number;
  scheduledFor: string | null;
  blockReason: string | null;
  approvalRequiredReason: string | null;
  holdReason: string | null;
  approvedBy: string | null;
  sentAt: string | null;
  attemptCount: number;
  nextAttemptAt: string | null;
  claimedBy: string | null;
  createdAt: string;
  accountState: string | null;
  outboundEligible: boolean;
  ineligibleReason: string | null;
};

export type PlatformQueueStats = {
  platformSlug: string;
  platformName: string;
  postingMode: string;
  queued: number;
  scheduled: number;
  needsApproval: number;
  blocked: number;
  held: number;
  nextScheduledFor: string | null;
};

export type QueueView = {
  dealershipId: string;
  dealerName: string;
  generatedAt: string;
  pending: QueueItemView[];
  terminal: QueueItemView[];
  overdue: QueueItemView[];
  retryPending: QueueItemView[];
  claimed: QueueItemView[];
  platformAccounts: Array<{ platformSlug: string; platformName: string; state: string }>;
  byPlatform: PlatformQueueStats[];
  summary: {
    ready: number;
    scheduled: number;
    needsApproval: number;
    blocked: number;
    held: number;
    claimed: number;
    overdue: number;
    retryPending: number;
    sent: number;
    failed: number;
  };
};

const OAUTH_EXPIRY_BUFFER_MS = 60_000;

function liveOAuthProviders(tokenRows: Array<{ provider: string; expiresAt: Date | null }>): Set<string> {
  const isExpired = (exp: Date | null) =>
    exp !== null && exp.getTime() - OAUTH_EXPIRY_BUFFER_MS <= Date.now();
  return new Set(tokenRows.filter(t => !isExpired(t.expiresAt)).map(t => t.provider));
}

function oauthConnectedForPlatform(
  profile: { oauthProvider?: string | null } | undefined,
  liveProviders: Set<string>,
): boolean {
  if (!profile?.oauthProvider) return true;
  return liveProviders.has(profile.oauthProvider);
}

// ── Queue population ─────────────────────────────────────────────────────────

export async function enqueueFromVehicleUpdate(
  prisma: PrismaClient,
  dealershipId: string,
  vehicleId: string,
  kind: VehicleUpdateKind,
  propagations: VehicleUpdatePropagation[]
): Promise<{ queued: number; syncEventId: string }> {
  // Guard: scope propagations to platforms allowed for this dealer's business category.
  const dealer = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { businessCategory: true, desiredChannels: true },
  });
  const businessCategory = dealer?.businessCategory ?? null;
  const desiredChannels = parseDesiredChannels(dealer?.desiredChannels);
  const allowedPropagations = propagations.filter(
    prop => isPlatformAllowedForCategory(prop.platformSlug, businessCategory),
  );

  const [accounts, deselections, oauthTokens, siteAvailability] = await Promise.all([
    prisma.platformAccount.findMany({
      where: { dealershipId },
      select: {
        platformSlug: true,
        state: true,
        dealerEnabled: true,
        autoSyncReadyInventory: true,
      },
    }),
    prisma.vehicleChannelSelection.findMany({
      where: { dealershipId, vehicleId, selected: false },
      select: { channelKey: true },
    }),
    prisma.platformOAuthToken.findMany({
      where: { dealershipId },
      select: { provider: true, expiresAt: true },
    }),
    loadSiteAvailabilityMap(prisma),
  ]);
  const accountBySlug = new Map(accounts.map(a => [a.platformSlug, a]));
  const profileBySlug = new Map(platformProfiles.map(p => [p.slug, p]));
  const liveOAuth = liveOAuthProviders(oauthTokens);
  const deselectedSlugs = new Set(deselections.map(d => d.channelKey));

  // Pick the right SyncEventKind
  const syncEventKind = kind === 'SOLD'
    ? 'VEHICLE_SOLD'
    : kind === 'REMOVED'
    ? 'VEHICLE_REMOVED'
    : 'INVENTORY_CHANGE';

  const syncEventId = await recordSyncEvent(prisma, {
    dealershipId,
    vehicleId,
    kind: syncEventKind as any,
    payload: { triggerKind: kind, platformCount: allowedPropagations.length, action: allowedPropagations.map(p => p.action) }
  });

  // Load persisted policies; fall back to defaults
  const policies = await prisma.syncPolicy.findMany({ where: { dealershipId } });
  const policyMap = new Map(policies.map(p => [p.platformSlug, p]));

  let queued = 0;

  for (const prop of allowedPropagations) {
    if (prop.action === 'NO_ACTION') continue;

    const profile = profileBySlug.get(prop.platformSlug);
    const account = accountBySlug.get(prop.platformSlug);
    const accountState = account?.state ?? null;
    const siteEnabled = resolveSiteEnabled(prop.platformSlug, siteAvailability);
    const deselectedKeys = new Set<string>();
    if (deselectedSlugs.has(prop.platformSlug)) {
      deselectedKeys.add(vehicleChannelKey(vehicleId, prop.platformSlug));
    }
    if (
      !isAutoSyncEnabledForPlatform(prop.platformSlug, account?.autoSyncReadyInventory ?? null)
    ) {
      continue;
    }
    if (
      !isQueueItemOutboundEligible({
        platformSlug: prop.platformSlug,
        integrationClass: (profile?.integrationClass ?? prop.integrationClass) as IntegrationClass,
        vehicleId,
        businessCategory,
        siteEnabled,
        dealerEnabled: account?.dealerEnabled,
        accountState,
        desiredChannels,
        eligibleVehicleCountForPlatform: 1,
        deselectedKeys,
        oauthProvider: profile?.oauthProvider ?? null,
        oauthConnected: oauthConnectedForPlatform(profile, liveOAuth),
      })
    ) {
      continue;
    }

    const policy = policyMap.get(prop.platformSlug);
    const mode: SyncMode = (policy?.mode as SyncMode) ?? defaultSyncMode(prop.integrationClass as IntegrationClass);
    const urgentRemoval = policy?.urgentRemoval ?? true;

    const status = resolveQueueStatus(mode, kind, urgentRemoval);
    const priority = resolvePriority(kind);
    const scheduledFor = resolveScheduledFor(mode);
    const blockReason = resolveBlockReason(status, mode);

    // Cancel any open item for this vehicle × platform, including stale blockers.
    await prisma.publishQueueItem.updateMany({
      where: {
        dealershipId,
        vehicleId,
        platformSlug: prop.platformSlug,
        status: { in: ['READY', 'SCHEDULED', 'NEEDS_APPROVAL', 'BLOCKED', 'HELD'] as any }
      },
      data: { status: 'CANCELLED' as any }
    });

    const approvalRequiredReason = status === 'NEEDS_APPROVAL'
      ? `${prop.integrationClass} platform change requires operator review before dispatch.`
      : null;

    const created = await prisma.publishQueueItem.create({
      data: {
        dealershipId,
        vehicleId,
        platformSlug: prop.platformSlug,
        triggerKind: kind,
        status: status as any,
        policyMode: mode as any,
        priority,
        scheduledFor,
        blockReason,
        approvalRequiredReason
      }
    });

    // Emit APPROVAL_REQUESTED event so the approval gate has an audit entry
    if (status === 'NEEDS_APPROVAL') {
      await recordSyncEvent(prisma, {
        dealershipId,
        vehicleId,
        platformSlug: prop.platformSlug,
        kind: 'APPROVAL_REQUESTED',
        payload: {
          queueItemId: created.id,
          triggerKind: kind,
          reason: approvalRequiredReason,
          policyMode: mode
        }
      });
    }

    queued++;
  }

  return { queued, syncEventId };
}

// ── Queue read ────────────────────────────────────────────────────────────────

const NON_TERMINAL: string[] = ['READY', 'SCHEDULED', 'NEEDS_APPROVAL', 'BLOCKED', 'HELD'];
const TERMINAL: string[] = ['SENT', 'FAILED', 'CANCELLED'];
const IN_FLIGHT: string[] = ['CLAIMED'];

export async function getQueueView(
  prisma: PrismaClient,
  dealershipId: string
): Promise<QueueView> {
  const dealer = await prisma.dealershipProfile.findUniqueOrThrow({ where: { id: dealershipId } });
  const businessCategory = dealer.businessCategory;
  const desiredChannels = parseDesiredChannels(dealer.desiredChannels);

  const [items, accounts, deselections, readyVehicles, oauthTokens, siteAvailability] = await Promise.all([
    prisma.publishQueueItem.findMany({
      where: { dealershipId },
      include: { vehicle: { select: { stockNumber: true, year: true, make: true, model: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.platformAccount.findMany({
      where: { dealershipId },
      orderBy: { platformSlug: 'asc' },
    }),
    prisma.vehicleChannelSelection.findMany({
      where: { dealershipId, selected: false },
      select: { vehicleId: true, channelKey: true },
    }),
    prisma.vehicle.findMany({
      where: { dealershipId, soldAt: null, removedAt: null, listingStatus: 'READY' },
      select: { id: true },
    }),
    prisma.platformOAuthToken.findMany({
      where: { dealershipId },
      select: { provider: true, expiresAt: true },
    }),
    loadSiteAvailabilityMap(prisma),
  ]);

  const profileBySlug = new Map(platformProfiles.map(p => [p.slug, p]));
  const accountStateBySlug = new Map(accounts.map(a => [a.platformSlug, a.state as string]));
  const dealerEnabledBySlug = new Map(accounts.map(a => [a.platformSlug, a.dealerEnabled]));
  const liveOAuth = liveOAuthProviders(oauthTokens);

  const deselectedKeys = new Set(
    deselections.map(d => vehicleChannelKey(d.vehicleId, d.channelKey)),
  );
  const readyVehicleIds = new Set(readyVehicles.map(v => v.id));
  const eligibleVehicleCountByPlatform = new Map<string, number>();
  for (const profile of platformProfiles) {
    if (!isPlatformAllowedForCategory(profile.slug, businessCategory)) continue;
    let count = 0;
    for (const vehicleId of readyVehicleIds) {
      if (!deselectedKeys.has(vehicleChannelKey(vehicleId, profile.slug))) count++;
    }
    eligibleVehicleCountByPlatform.set(profile.slug, count);
  }

  const toView = (item: typeof items[number]): QueueItemView => {
    const profile = profileBySlug.get(item.platformSlug);
    const v = item.vehicle;
    const accountState = accountStateBySlug.get(item.platformSlug) ?? null;
    const siteEnabled = resolveSiteEnabled(item.platformSlug, siteAvailability);
    const eligibleVehicleCountForPlatform =
      eligibleVehicleCountByPlatform.get(item.platformSlug) ?? 0;
    const integrationClass = (profile?.integrationClass ?? 'FEEDABLE') as IntegrationClass;
    const oauthProvider = profile?.oauthProvider ?? null;
    const oauthConnected = oauthConnectedForPlatform(profile, liveOAuth);
    const eligibilityInput = {
      platformSlug: item.platformSlug,
      integrationClass,
      vehicleId: item.vehicleId,
      businessCategory,
      siteEnabled,
      dealerEnabled: dealerEnabledBySlug.get(item.platformSlug),
      accountState,
      desiredChannels,
      eligibleVehicleCountForPlatform,
      deselectedKeys,
      oauthProvider,
      oauthConnected,
    };
    const outboundEligible = isQueueItemOutboundEligible(eligibilityInput);
    const ineligibleReason = outboundEligible
      ? null
      : ineligibleReasonForQueueItem(eligibilityInput);

    return {
      id: item.id,
      assetRef: v?.stockNumber ?? null,
      assetTitle: v ? `${v.year} ${v.make} ${v.model}` : null,
      assetId: item.vehicleId,
      platformSlug: item.platformSlug,
      platformName: profile?.name ?? item.platformSlug,
      integrationClass,
      triggerKind: item.triggerKind,
      status: item.status,
      policyMode: item.policyMode,
      priority: item.priority,
      scheduledFor: item.scheduledFor?.toISOString() ?? null,
      blockReason: item.blockReason,
      approvalRequiredReason: item.approvalRequiredReason,
      holdReason: item.holdReason ?? null,
      approvedBy: item.approvedBy,
      sentAt: item.sentAt?.toISOString() ?? null,
      attemptCount: item.attemptCount,
      nextAttemptAt: item.nextAttemptAt?.toISOString() ?? null,
      claimedBy: item.claimedBy ?? null,
      createdAt: item.createdAt.toISOString(),
      accountState,
      outboundEligible,
      ineligibleReason,
    };
  };

  const allViews = items.map(toView);
  const visible = (list: QueueItemView[]) => list.filter(i => i.outboundEligible);

  const now = new Date();
  const pendingAll  = allViews.filter(i => NON_TERMINAL.includes(i.status));
  const pending  = visible(pendingAll);
  const terminal = visible(allViews.filter(i => TERMINAL.includes(i.status)));
  const claimed  = visible(allViews.filter(i => IN_FLIGHT.includes(i.status)));
  const overdue  = pending.filter(i => i.status === 'SCHEDULED' && i.scheduledFor !== null && new Date(i.scheduledFor) < now);
  const retryPending = visible(
    allViews.filter(
      i => i.status === 'FAILED' && i.attemptCount < 3 &&
      (i.nextAttemptAt === null || new Date(i.nextAttemptAt) <= now),
    ),
  );

  const accountViews = accounts.map(a => ({
    platformSlug: a.platformSlug,
    platformName: profileBySlug.get(a.platformSlug)?.name ?? a.platformSlug,
    state: a.state,
  }));

  const policies = await prisma.syncPolicy.findMany({ where: { dealershipId } });
  const policyModeBySlug = new Map(policies.map(p => [p.platformSlug, p.mode as string]));

  const slugSet = new Set([
    ...accounts.map(a => a.platformSlug),
    ...pending.map(i => i.platformSlug),
    ...policies.map(p => p.platformSlug),
  ]);

  const byPlatform: PlatformQueueStats[] = [...slugSet].map(slug => {
    const platformPending = pending.filter(i => i.platformSlug === slug);
    const scheduledItems = platformPending.filter(i => i.status === 'SCHEDULED' && i.scheduledFor);
    const nextScheduled = scheduledItems
      .map(i => i.scheduledFor!)
      .sort()[0] ?? null;
    return {
      platformSlug: slug,
      platformName: profileBySlug.get(slug)?.name ?? slug,
      postingMode: policyModeBySlug.get(slug) ?? 'SCHEDULED',
      queued: platformPending.filter(i => i.status === 'READY').length,
      scheduled: platformPending.filter(i => i.status === 'SCHEDULED').length,
      needsApproval: platformPending.filter(i => i.status === 'NEEDS_APPROVAL').length,
      blocked: platformPending.filter(i => i.status === 'BLOCKED').length,
      held: platformPending.filter(i => i.status === 'HELD').length,
      nextScheduledFor: nextScheduled,
    };
  }).sort((a, b) => a.platformName.localeCompare(b.platformName));

  const summary = {
    ready:        pending.filter(i => i.status === 'READY').length,
    scheduled:    pending.filter(i => i.status === 'SCHEDULED').length,
    needsApproval:pending.filter(i => i.status === 'NEEDS_APPROVAL').length,
    blocked:      pending.filter(i => i.status === 'BLOCKED').length,
    held:         pending.filter(i => i.status === 'HELD').length,
    claimed:      claimed.length,
    overdue:      overdue.length,
    retryPending: retryPending.length,
    sent:         terminal.filter(i => i.status === 'SENT').length,
    failed:       terminal.filter(i => i.status === 'FAILED').length,
  };

  return {
    dealershipId,
    dealerName: dealer.legalName,
    generatedAt: new Date().toISOString(),
    pending,
    terminal,
    overdue,
    retryPending,
    claimed,
    platformAccounts: accountViews,
    byPlatform,
    summary
  };
}

const DISPATCHABLE_STATUSES = new Set(['READY', 'SCHEDULED', 'FAILED']);

export async function dispatchQueueItemNow(
  prisma: PrismaClient,
  dealershipId: string,
  itemId: string,
  operator: string,
): Promise<{ sent: boolean; queueItemId: string }> {
  const item = await prisma.publishQueueItem.findFirst({
    where: { id: itemId, dealershipId },
    include: { vehicle: { select: { stockNumber: true } } },
  });
  if (!item) throw new Error('Queue item not found');

  if (!DISPATCHABLE_STATUSES.has(item.status)) {
    throw new Error(`Cannot publish item in status ${item.status}`);
  }
  if (item.status === 'FAILED' && item.attemptCount >= 3) {
    throw new Error('Maximum retry attempts reached');
  }

  await prisma.publishQueueItem.update({
    where: { id: itemId },
    data: { status: 'READY' as any, scheduledFor: new Date() },
  });

  await prisma.publishQueueItem.update({
    where: { id: itemId },
    data: { status: 'SENT' as any, sentAt: new Date() },
  });

  await recordSyncEvent(prisma, {
    dealershipId,
    vehicleId: item.vehicleId,
    platformSlug: item.platformSlug,
    kind: 'SUBMISSION_SENT',
    payload: {
      queueItemId: itemId,
      triggerKind: item.triggerKind,
      stockNumber: item.vehicle?.stockNumber ?? null,
      operator,
      manual: true,
      environment: 'MOCK',
    },
  });

  return { sent: true, queueItemId: itemId };
}

// ── Queue mutations ──────────────────────────────────────────────────────────
// Note: approve/hold/reject/release are in approvalService.ts

export async function processReadyItems(
  prisma: PrismaClient,
  dealershipId: string,
  triggeredBy = 'OPERATOR'
): Promise<{ runId: string; sent: number; skipped: number }> {
  const now = new Date();

  const ready = await prisma.publishQueueItem.findMany({
    where: {
      dealershipId,
      status: { in: ['READY', 'SCHEDULED'] as any }
    },
    include: { vehicle: { select: { stockNumber: true } } }
  });

  // Filter SCHEDULED items whose scheduledFor has arrived
  const toProcess = ready.filter(item =>
    item.status === 'READY' ||
    (item.status === 'SCHEDULED' && item.scheduledFor != null && item.scheduledFor <= now)
  );

  const syncRun = await prisma.syncRun.create({
    data: {
      dealershipId,
      triggeredBy,
      status: 'RUNNING',
      itemsTotal: toProcess.length,
      startedAt: now
    }
  });

  let sent = 0;
  let skipped = 0;

  for (const item of toProcess) {
    // In MOCK env: mark SENT immediately (no real API call)
    await prisma.publishQueueItem.update({
      where: { id: item.id },
      data: { status: 'SENT' as any, sentAt: new Date() }
    });

    await recordSyncEvent(prisma, {
      dealershipId,
      vehicleId: item.vehicleId,
      platformSlug: item.platformSlug,
      kind: 'SUBMISSION_SENT',
      payload: {
        queueItemId: item.id,
        triggerKind: item.triggerKind,
        stockNumber: item.vehicle?.stockNumber ?? null,
        environment: 'MOCK'
      },
      syncRunId: syncRun.id
    });
    sent++;
  }

  skipped = ready.length - toProcess.length;

  await prisma.syncRun.update({
    where: { id: syncRun.id },
    data: {
      status: 'COMPLETE',
      itemsSent: sent,
      itemsSkipped: skipped,
      completedAt: new Date()
    }
  });

  return { runId: syncRun.id, sent, skipped };
}
