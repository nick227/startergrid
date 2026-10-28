import type {
  AutopilotPreference,
  OnboardingStepKey,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { HttpError } from './httpError.js';
import { defaultIncomplete, defaultOwner, upsertStep } from './onboardingSteps.js';
import { recordDealershipActivity } from './activityService.js';
import { channelSetupStatus } from './channelSetupStatus.js';
import { categoryInventorySource, isRegisteredCategory } from '../../../packages/category-schemas/src/index.js';
import { readOnboardingEvidence } from './onboardingEvidence.js';

type Db = PrismaClient | Prisma.TransactionClient;

export type OnboardingSnapshot = {
  dealershipId: string;
  lifecycleStatus: string;
  waitingForStock: boolean;
  autopilotPreference: AutopilotPreference;
  nextStep: {
    stepKey: OnboardingStepKey;
    ownerKind: string;
    incompleteReason: string | null;
  } | null;
  steps: Array<{
    stepKey: OnboardingStepKey;
    status: string;
    ownerKind: string;
    ownerOperatorId: string | null;
    incompleteReason: string | null;
    evidence: unknown;
    completedAt: string | null;
  }>;
};

export async function refreshOnboarding(db: Db, dealershipId: string, actorId?: string | null): Promise<OnboardingSnapshot> {
  const dealer = await db.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: {
      id: true,
      businessCategory: true,
      lifecycleStatus: true,
      waitingForStock: true,
      autopilotPreference: true,
      launchCompletedAt: true,
      handoffCompletedAt: true,
      handoffCompletedBy: true,
      _count: { select: { vehicles: true, invitations: true, operatorAccess: true } },
      invitations: {
        where: { accessRole: 'DEALER_OWNER', revokedAt: null },
        select: { deliveryStatus: true, acceptedAt: true },
      },
      operatorAccess: {
        where: { accessRole: { in: ['DEALER_OWNER', 'DEALER_STAFF'] } },
        select: {
          accessRole: true,
          operator: { select: { firstLoginAt: true, lastLoginAt: true, isActive: true, mustChangePassword: true } },
        },
      },
    },
  });
  if (!dealer) throw new HttpError(404, 'Dealership not found');

  const owners = dealer.operatorAccess.filter((row) => row.accessRole === 'DEALER_OWNER' && row.operator.isActive && !row.operator.mustChangePassword);
  const ownerLoggedIn = owners.some(row => Boolean(row.operator.firstLoginAt ?? row.operator.lastLoginAt));
  const inviteAccepted = dealer.invitations.some((row) => row.acceptedAt);
  const inviteOpen = dealer.invitations.some((row) =>
    !row.acceptedAt && (row.deliveryStatus === 'SENT' || row.deliveryStatus === 'PENDING' || row.deliveryStatus === 'FAILED'));
  const hasOwnerAccess = owners.length > 0;
  const inventorySource = isRegisteredCategory(dealer.businessCategory)
    ? categoryInventorySource(dealer.businessCategory)
    : 'vehicle';
  const categoryItemCount = inventorySource === 'category_item'
    ? await db.categoryInventoryItem.count({ where: { dealershipId, soldAt: null, removedAt: null } })
    : 0;
  const hasStock = inventorySource === 'category_item' ? categoryItemCount > 0 : dealer._count.vehicles > 0;
  const vehiclesReady = hasStock && !dealer.waitingForStock;
  const evidence = vehiclesReady
    ? await readOnboardingEvidence(db, dealershipId)
    : { vehicleId: null, categoryItemId: null, inboxLeadId: null };
  // Missing default channel rows block setup until a retry repairs them. Live dealerships
  // are not re-flagged here; their record still reports the channel setup status.
  const inSetup = !['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(dealer.lifecycleStatus);
  const channelSetup = inSetup ? await channelSetupStatus(db, dealershipId) : { ready: true, missing: [] };
  const channelsReady = Boolean(evidence.vehicleId || evidence.categoryItemId);
  const handoffReady = hasOwnerAccess && ownerLoggedIn && vehiclesReady && channelsReady && Boolean(evidence.inboxLeadId);

  await upsertStep(db, dealershipId, 'CREATE', {
    status: 'COMPLETE',
    ownerKind: 'OUR_TEAM',
    incompleteReason: null,
    completedAt: new Date(),
    completedBy: actorId ?? null,
  });

  if (hasOwnerAccess && (inviteAccepted || ownerLoggedIn)) {
    await upsertStep(db, dealershipId, 'ACCESS', {
      status: 'COMPLETE',
      ownerKind: 'OUR_TEAM',
      incompleteReason: null,
      evidenceJson: { ownerLoggedIn, inviteAccepted },
      completedAt: new Date(),
      completedBy: actorId ?? null,
    });
  } else if (inviteOpen || hasOwnerAccess) {
    await upsertStep(db, dealershipId, 'ACCESS', {
      status: 'IN_PROGRESS',
      ownerKind: inviteOpen ? 'DEALER' : 'OUR_TEAM',
      incompleteReason: ownerLoggedIn ? null : 'Waiting for the owner to accept the invite or sign in',
    });
  } else {
    await upsertStep(db, dealershipId, 'ACCESS', {
      status: 'IN_PROGRESS',
      ownerKind: defaultOwner('ACCESS'),
      incompleteReason: defaultIncomplete('ACCESS'),
    });
  }

  if (vehiclesReady) {
    await upsertStep(db, dealershipId, 'VEHICLES', {
      status: 'COMPLETE',
      ownerKind: 'DEALER',
      incompleteReason: null,
      evidenceJson: { vehicleCount: dealer._count.vehicles, categoryItemCount, waitingForStock: dealer.waitingForStock },
      completedAt: new Date(),
      completedBy: actorId ?? null,
    });
  } else {
    await upsertStep(db, dealershipId, 'VEHICLES', {
      status: 'IN_PROGRESS',
      ownerKind: 'DEALER',
      incompleteReason: dealer.waitingForStock
        ? `Waiting for stock; launch requires an eligible published ${inventorySource === 'category_item' ? 'category item' : 'vehicle'}`
        : defaultIncomplete('VEHICLES'),
    });
  }

  if (!channelSetup.ready && !channelsReady) {
    await upsertStep(db, dealershipId, 'CHANNELS', {
      status: 'BLOCKED',
      ownerKind: 'OUR_TEAM',
      incompleteReason: `Default channel setup did not finish for ${channelSetup.missing.length} destination${channelSetup.missing.length === 1 ? '' : 's'}. Retry channel setup.`,
      evidenceJson: { channelSetup: 'INCOMPLETE', missing: channelSetup.missing },
      completedAt: null,
      completedBy: null,
    });
  } else if (channelsReady) {
    await upsertStep(db, dealershipId, 'CHANNELS', {
      status: 'COMPLETE',
      ownerKind: 'OUR_TEAM',
      incompleteReason: null,
      evidenceJson: { channel: 'consumer-marketplace', vehicleId: evidence.vehicleId, categoryItemId: evidence.categoryItemId, method: 'OWNED_READ_MODEL' },
      completedAt: new Date(),
      completedBy: actorId ?? null,
    });
  } else {
    await upsertStep(db, dealershipId, 'CHANNELS', {
      status: 'IN_PROGRESS',
      ownerKind: 'OUR_TEAM',
      incompleteReason: inventorySource === 'category_item'
        ? 'Publish an eligible category item and verify it is visible on Marketplace; an Autopilot preference is not publication'
        : 'Publish an eligible vehicle and verify it is visible on Auto Marketplace; an Autopilot preference is not publication',
    });
  }

  const readyForHandoff = hasOwnerAccess && vehiclesReady && channelsReady;
  if (dealer.handoffCompletedAt && handoffReady) {
    await upsertStep(db, dealershipId, 'HANDOFF', {
      status: 'COMPLETE',
      ownerKind: 'OUR_TEAM',
      incompleteReason: null,
      evidenceJson: { ownerLoggedIn, inboxLeadId: evidence.inboxLeadId, handoffCompletedAt: dealer.handoffCompletedAt.toISOString() },
      completedAt: dealer.handoffCompletedAt,
      completedBy: dealer.handoffCompletedBy ?? actorId ?? null,
    });
  } else if (readyForHandoff && !ownerLoggedIn) {
    await upsertStep(db, dealershipId, 'HANDOFF', {
      status: 'IN_PROGRESS',
      ownerKind: 'DEALER',
      incompleteReason: 'Owner has not signed in yet',
    });
  } else if (readyForHandoff) {
    await upsertStep(db, dealershipId, 'HANDOFF', {
      status: evidence.inboxLeadId ? 'IN_PROGRESS' : 'BLOCKED',
      ownerKind: 'OUR_TEAM',
      incompleteReason: evidence.inboxLeadId ? 'Complete handoff; the owner has signed in and a marketplace inquiry reached the shared inbox' : 'Verify a marketplace inquiry reaches this dealership’s shared Leads inbox',
      evidenceJson: { inboxLeadId: evidence.inboxLeadId },
    });
  } else {
    await upsertStep(db, dealershipId, 'HANDOFF', {
      status: 'NOT_STARTED',
      ownerKind: 'OUR_TEAM',
      incompleteReason: defaultIncomplete('HANDOFF'),
    });
  }

  await syncLifecycle(db, dealershipId, {
    launched: hasOwnerAccess && vehiclesReady && channelsReady,
  });

  return getOnboarding(db, dealershipId);
}

export async function getOnboarding(db: Db, dealershipId: string): Promise<OnboardingSnapshot> {
  const dealer = await db.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: {
      id: true,
      lifecycleStatus: true,
      waitingForStock: true,
      autopilotPreference: true,
      onboardingSteps: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!dealer) throw new HttpError(404, 'Dealership not found');

  const steps = dealer.onboardingSteps.map((step) => ({
    stepKey: step.stepKey,
    status: step.status,
    ownerKind: step.ownerKind,
    ownerOperatorId: step.ownerOperatorId,
    incompleteReason: step.incompleteReason,
    evidence: step.evidenceJson,
    completedAt: step.completedAt?.toISOString() ?? null,
  }));
  const next = steps.find((step) => step.status !== 'COMPLETE') ?? null;

  return {
    dealershipId: dealer.id,
    lifecycleStatus: dealer.lifecycleStatus,
    waitingForStock: dealer.waitingForStock,
    autopilotPreference: dealer.autopilotPreference,
    nextStep: next
      ? { stepKey: next.stepKey, ownerKind: next.ownerKind, incompleteReason: next.incompleteReason }
      : null,
    steps,
  };
}

async function syncLifecycle(
  db: Db,
  dealershipId: string,
  flags: {
    launched: boolean;
  },
): Promise<void> {
  const current = await db.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { lifecycleStatus: true, launchCompletedAt: true },
  });
  if (!current) return;
  if (current.lifecycleStatus === 'PAUSED' || current.lifecycleStatus === 'ARCHIVED') return;

  let lifecycleStatus = current.lifecycleStatus;
  if (flags.launched || (current.lifecycleStatus === 'ACTIVE' && current.launchCompletedAt)) lifecycleStatus = 'ACTIVE';
  else lifecycleStatus = 'SETTING_UP';

  if (lifecycleStatus !== current.lifecycleStatus || (flags.launched && !current.launchCompletedAt)) {
    await db.dealershipProfile.update({
      where: { id: dealershipId },
      data: { lifecycleStatus, ...(flags.launched && !current.launchCompletedAt ? { launchCompletedAt: new Date() } : {}) },
    });
  }
}

export async function completeHandoff(
  db: Db,
  dealershipId: string,
  actor: { id: string; email: string },
): Promise<OnboardingSnapshot> {
  // Serialize repeated handoff submissions and commit evidence, milestone and audit
  // together. A transaction client is also accepted by internal callers.
  if ('$transaction' in db) {
    return db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM DealershipProfile WHERE id = ${dealershipId} FOR UPDATE`;
      return completeHandoff(tx, dealershipId, actor);
    });
  }
  const snapshot = await refreshOnboarding(db, dealershipId, actor.id);
  const access = snapshot.steps.find((step) => step.stepKey === 'ACCESS');
  const vehicles = snapshot.steps.find((step) => step.stepKey === 'VEHICLES');
  const channels = snapshot.steps.find((step) => step.stepKey === 'CHANNELS');
  if (access?.status !== 'COMPLETE' || vehicles?.status !== 'COMPLETE' || channels?.status !== 'COMPLETE') {
    throw new HttpError(409, snapshot.nextStep?.incompleteReason ?? 'Onboarding is not ready for handoff');
  }

  const handoff = snapshot.steps.find(step => step.stepKey === 'HANDOFF');
  if (!handoff || handoff.ownerKind === 'DEALER' || !['IN_PROGRESS', 'COMPLETE'].includes(handoff.status)) {
    throw new HttpError(409, handoff?.incompleteReason ?? 'Handoff evidence is incomplete');
  }
  if (handoff?.status === 'COMPLETE') return snapshot;
  if (snapshot.lifecycleStatus === 'PAUSED' || snapshot.lifecycleStatus === 'ARCHIVED') {
    throw new HttpError(409, 'Resume the dealership before completing handoff');
  }

  await db.dealershipProfile.update({
    where: { id: dealershipId },
    data: {
      handoffCompletedAt: new Date(),
      handoffCompletedBy: actor.id,
    },
  });
  await recordDealershipActivity(db, {
    dealershipId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'HANDOFF_COMPLETED',
  });
  return refreshOnboarding(db, dealershipId, actor.id);
}
