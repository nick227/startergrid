import { platformProfiles } from '../../data/platformProfiles.js';
import type { DealershipLifecycle, Prisma, PrismaClient } from '@prisma/client';
import { HttpError } from './httpError.js';
import { getOnboarding, refreshOnboarding } from './onboardingService.js';
import { listPeople } from './peopleAccessService.js';
import { assignInternalOwner } from './peopleAccessService.js';
import { recordDealershipActivity } from './activityService.js';
import { ONBOARDING_STEP_KEYS } from './onboardingSteps.js';
import { channelSetupStatus } from './channelSetupStatus.js';

type Db = PrismaClient | Prisma.TransactionClient;

const ATTENTION_LIFECYCLES: DealershipLifecycle[] = ['DRAFT', 'SETTING_UP', 'READY_TO_LAUNCH'];

export type DealershipListQuery = {
  q?: string;
  lifecycle?: DealershipLifecycle;
  needsAttention?: boolean;
  internalOwnerId?: string;
  limit?: number;
};

export function dealershipListWhere(
  query: DealershipListQuery,
  scope: { global: boolean; dealerIds: string[] },
): Prisma.DealershipProfileWhereInput {
  const clauses: Prisma.DealershipProfileWhereInput[] = [];
  if (!scope.global) clauses.push({ id: { in: scope.dealerIds } });
  if (query.lifecycle) clauses.push({ lifecycleStatus: query.lifecycle });
  if (query.internalOwnerId) clauses.push({ internalOwnerId: query.internalOwnerId });
  const q = query.q?.trim();
  if (q) {
    clauses.push({
      OR: [
        { legalName: { contains: q } },
        { dbaName: { contains: q } },
        { primaryContactEmail: { contains: q } },
        { operatorAccess: { some: { operator: { email: { contains: q } } } } },
      ],
    });
  }
  if (query.needsAttention) {
    clauses.push({
      OR: [
        { waitingForStock: true },
        { lifecycleStatus: { in: ATTENTION_LIFECYCLES } },
        { onboardingSteps: { some: { status: { in: ['BLOCKED', 'NEEDS_RECHECK'] } } } },
      ],
    });
  }
  return clauses.length > 0 ? { AND: clauses } : {};
}

// Blocked steps come first: a failure our team must fix outranks waiting on someone else.
function firstOpenStep<T extends { stepKey: string; status?: string }>(steps: T[]): T | null {
  const blocked = (step: T) => (step.status === 'BLOCKED' || step.status === 'NEEDS_RECHECK' ? 0 : 1);
  return [...steps].sort((a, b) => blocked(a) - blocked(b)
    || ONBOARDING_STEP_KEYS.indexOf(a.stepKey as never) - ONBOARDING_STEP_KEYS.indexOf(b.stepKey as never))[0] ?? null;
}

export async function listDealershipRecords(
  db: Db,
  query: DealershipListQuery,
  scope: { global: boolean; dealerIds: string[] },
) {
  const take = Math.min(200, Math.max(1, query.limit ?? 50));
  const where = dealershipListWhere(query, scope);

  const rows = await db.dealershipProfile.findMany({
    where,
    orderBy: { legalName: 'asc' },
    take,
    select: {
      id: true,
      legalName: true,
      dbaName: true,
      logoUrl: true,
      businessCategory: true,
      lifecycleStatus: true,
      primaryContactEmail: true,
      internalOwnerId: true,
      waitingForStock: true,
      autopilotPreference: true,
      createdAt: true,
      onboardingSteps: {
        where: { status: { not: 'COMPLETE' } },
        select: { stepKey: true, status: true, ownerKind: true, incompleteReason: true },
      },
    },
  });

  const ids = rows.map((row) => row.id);
  const ownerIds = [...new Set(rows.map((row) => row.internalOwnerId).filter((id): id is string => Boolean(id)))];
  const [owners, lastActivity] = await Promise.all([
    ownerIds.length > 0
      ? db.operatorAccount.findMany({ where: { id: { in: ownerIds } }, select: { id: true, email: true } })
      : [],
    ids.length > 0
      ? db.dealershipActivityEvent.groupBy({
        by: ['dealershipId'],
        where: { dealershipId: { in: ids } },
        _max: { createdAt: true },
      })
      : [],
  ]);
  const distributionCounts = process.env['V5_AUTOPILOT_ENABLED'] === 'true' && ids.length
    ? await db.distributionIncident.groupBy({ by: ['dealershipId'], where: { dealershipId: { in: ids }, state: { not: 'RESOLVED' } }, _count: { id: true } })
    : [];
  const issuesByDealer = new Map(distributionCounts.map(row => [row.dealershipId, row._count.id]));
  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));
  const lastActivityById = new Map(lastActivity.map((row) => [row.dealershipId, row._max.createdAt]));

  return {
    dealerships: rows.map((row) => ({
      id: row.id,
      legalName: row.legalName,
      dbaName: row.dbaName,
      logoUrl: row.logoUrl,
      businessCategory: row.businessCategory,
      lifecycleStatus: row.lifecycleStatus,
      primaryContactEmail: row.primaryContactEmail,
      internalOwnerId: row.internalOwnerId,
      internalOwner: row.internalOwnerId ? ownerById.get(row.internalOwnerId) ?? null : null,
      waitingForStock: row.waitingForStock,
      autopilotPreference: row.autopilotPreference,
      createdAt: row.createdAt.toISOString(),
      lastActivityAt: (lastActivityById.get(row.id) ?? row.createdAt).toISOString(),
      openDistributionIncidents: issuesByDealer.get(row.id) ?? 0,
      blockedStepCount: row.onboardingSteps.filter((step) => step.status === 'BLOCKED' || step.status === 'NEEDS_RECHECK').length,
      nextStep: (() => {
        const step = firstOpenStep(row.onboardingSteps);
        return step ? { stepKey: step.stepKey, status: step.status, ownerKind: step.ownerKind, incompleteReason: step.incompleteReason } : null;
      })(),
    })),
  };
}

export async function getDealershipRecord(db: Db, dealershipId: string) {
  const dealer = await db.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: {
      id: true,
      legalName: true,
      dbaName: true,
      logoUrl: true,
      businessCategory: true,
      lifecycleStatus: true,
      primaryContactEmail: true,
      primaryContact: true,
      rooftopAddress: true,
      websiteUrl: true,
      internalOwnerId: true,
      waitingForStock: true,
      autopilotPreference: true,
      launchCompletedAt: true,
      handoffCompletedAt: true,
      createdAt: true,
      _count: { select: { vehicles: true, platformAccounts: true } },
    },
  });
  if (!dealer) throw new HttpError(404, 'Dealership not found');

  const [onboarding, people, vehicles, accounts, owner] = await Promise.all([
    getOnboarding(db, dealershipId),
    listPeople(db, dealershipId),
    db.vehicle.findMany({ where: { dealershipId }, select: { listingStatus: true, soldAt: true, removedAt: true } }),
    db.platformAccount.findMany({ where: { dealershipId }, select: { platformSlug: true, state: true, dealerEnabled: true } }),
    dealer.internalOwnerId ? db.operatorAccount.findUnique({ where: { id: dealer.internalOwnerId }, select: { id: true, email: true } }) : null,
  ]);
  const channelSetup = await channelSetupStatus(db, dealershipId);
  const latestEvent = await db.dealershipActivityEvent.findFirst({
    where: { dealershipId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  return {
    ...dealer,
    createdAt: dealer.createdAt.toISOString(),
    launchCompletedAt: dealer.launchCompletedAt?.toISOString() ?? null,
    handoffCompletedAt: dealer.handoffCompletedAt?.toISOString() ?? null,
    internalOwner: owner,
    lastActivityAt: (latestEvent?.createdAt ?? dealer.createdAt).toISOString(),
    channelSetup: { status: channelSetup.ready ? 'READY' : 'NEEDS_ATTENTION', missing: channelSetup.missing },
    inventory: { vehicleCount: dealer._count.vehicles, waitingForStock: dealer.waitingForStock,
      ready: vehicles.filter(v => v.listingStatus === 'READY' && !v.soldAt && !v.removedAt).length,
      needsAttention: vehicles.filter(v => v.listingStatus !== 'READY' && !v.soldAt && !v.removedAt).length,
      sold: vehicles.filter(v => v.soldAt || v.removedAt).length },
    channels: { accountCount: dealer._count.platformAccounts, autopilotPreference: dealer.autopilotPreference,
      items: accounts.map(a => ({ slug: a.platformSlug, name: platformProfiles.find(p => p.slug === a.platformSlug)?.name ?? a.platformSlug,
        status: !a.dealerEnabled ? 'PAUSED' : a.state === 'ACTIVE' ? 'ACTIVE' : a.state === 'CREDENTIALS_NEEDED' ? 'NEEDS_LOGIN' : 'SETUP_NEEDED' })) },
    onboarding,
    people,
  };
}

export async function patchDealershipRecord(
  db: Db,
  dealershipId: string,
  actor: { id: string; email: string },
  body: {
    internalOwnerId?: string;
    waitingForStock?: boolean;
    autopilotPreference?: 'OFF' | 'ON' | 'PAUSED';
    lifecycleStatus?: DealershipLifecycle;
  },
) {
  const existing = await db.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { id: true, waitingForStock: true, autopilotPreference: true, lifecycleStatus: true },
  });
  if (!existing) throw new HttpError(404, 'Dealership not found');

  if (body.internalOwnerId) {
    await assignInternalOwner(db, dealershipId, body.internalOwnerId, actor);
  }

  const data: Prisma.DealershipProfileUpdateInput = {};
  if (typeof body.waitingForStock === 'boolean') data.waitingForStock = body.waitingForStock;
  if (body.autopilotPreference !== undefined) data.autopilotPreference = body.autopilotPreference;
  if (body.lifecycleStatus === 'PAUSED' || body.lifecycleStatus === 'ARCHIVED' || body.lifecycleStatus === 'ACTIVE') {
    data.lifecycleStatus = body.lifecycleStatus;
  }
  if (Object.keys(data).length > 0) {
    await db.dealershipProfile.update({ where: { id: dealershipId }, data });
  }
  const changes: Array<[string, unknown, unknown]> = [
    ['WAITING_FOR_STOCK_CHANGED', existing.waitingForStock, data.waitingForStock],
    ['AUTOPILOT_PREFERENCE_CHANGED', existing.autopilotPreference, data.autopilotPreference],
    ['LIFECYCLE_CHANGED', existing.lifecycleStatus, data.lifecycleStatus],
  ];
  for (const [action, from, to] of changes) {
    if (to === undefined || to === from) continue;
    await recordDealershipActivity(db, {
      dealershipId,
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      detail: { from: from as Prisma.InputJsonValue, to: to as Prisma.InputJsonValue },
    });
  }
  await refreshOnboarding(db, dealershipId, actor.id);
  return getDealershipRecord(db, dealershipId);
}
