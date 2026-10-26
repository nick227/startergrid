import { platformProfiles } from '../../data/platformProfiles.js';
import type { DealershipLifecycle, Prisma, PrismaClient } from '@prisma/client';
import { HttpError } from './httpError.js';
import { getOnboarding, refreshOnboarding } from './onboardingService.js';
import { listPeople } from './peopleAccessService.js';
import { assignInternalOwner } from './peopleAccessService.js';

type Db = PrismaClient | Prisma.TransactionClient;

const ATTENTION_LIFECYCLES: DealershipLifecycle[] = ['DRAFT', 'SETTING_UP', 'READY_TO_LAUNCH'];

export function dealershipListWhere(
  query: { q?: string; lifecycle?: DealershipLifecycle; needsAttention?: boolean },
  scope: { global: boolean; dealerIds: string[] },
): Prisma.DealershipProfileWhereInput {
  const clauses: Prisma.DealershipProfileWhereInput[] = [];
  if (!scope.global) clauses.push({ id: { in: scope.dealerIds } });
  if (query.lifecycle) clauses.push({ lifecycleStatus: query.lifecycle });
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

export async function listDealershipRecords(
  db: Db,
  query: { q?: string; lifecycle?: DealershipLifecycle; needsAttention?: boolean; limit?: number },
  scope: { global: boolean; dealerIds: string[] },
) {
  const take = Math.min(100, Math.max(1, query.limit ?? 50));
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
        select: { stepKey: true, ownerKind: true, incompleteReason: true },
        take: 1,
      },
    },
  });

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
      waitingForStock: row.waitingForStock,
      autopilotPreference: row.autopilotPreference,
      createdAt: row.createdAt.toISOString(),
      nextStep: row.onboardingSteps[0] ?? null,
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

  return {
    ...dealer,
    createdAt: dealer.createdAt.toISOString(),
    launchCompletedAt: dealer.launchCompletedAt?.toISOString() ?? null,
    handoffCompletedAt: dealer.handoffCompletedAt?.toISOString() ?? null,
    internalOwner: owner,
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
    select: { id: true },
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
  await refreshOnboarding(db, dealershipId, actor.id);
  return getDealershipRecord(db, dealershipId);
}
