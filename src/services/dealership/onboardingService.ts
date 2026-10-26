import type {
  AutopilotPreference,
  OnboardingStepKey,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { HttpError } from './httpError.js';
import { defaultIncomplete, defaultOwner, upsertStep } from './onboardingSteps.js';
import { recordDealershipActivity } from './activityService.js';

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
      lifecycleStatus: true,
      waitingForStock: true,
      autopilotPreference: true,
      launchCompletedAt: true,
      handoffCompletedAt: true,
      _count: { select: { vehicles: true, invitations: true, operatorAccess: true } },
      invitations: {
        where: { accessRole: 'DEALER_OWNER', revokedAt: null },
        select: { deliveryStatus: true, acceptedAt: true },
      },
      operatorAccess: {
        where: { accessRole: { in: ['DEALER_OWNER', 'DEALER_STAFF'] } },
        select: {
          accessRole: true,
          operator: { select: { firstLoginAt: true, lastLoginAt: true, isActive: true } },
        },
      },
    },
  });
  if (!dealer) throw new HttpError(404, 'Dealership not found');

  const ownerAccess = dealer.operatorAccess.find((row) => row.accessRole === 'DEALER_OWNER');
  const ownerLoggedIn = Boolean(ownerAccess?.operator.firstLoginAt ?? ownerAccess?.operator.lastLoginAt);
  const inviteAccepted = dealer.invitations.some((row) => row.acceptedAt);
  const inviteOpen = dealer.invitations.some((row) =>
    !row.acceptedAt && (row.deliveryStatus === 'SENT' || row.deliveryStatus === 'PENDING' || row.deliveryStatus === 'FAILED'));
  const hasOwnerAccess = Boolean(ownerAccess);
  const hasVehicles = dealer._count.vehicles > 0;
  const vehiclesReady = hasVehicles || dealer.waitingForStock;
  const channelsReady = dealer.autopilotPreference !== 'OFF' || Boolean(dealer.launchCompletedAt);

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
      evidenceJson: { vehicleCount: dealer._count.vehicles, waitingForStock: dealer.waitingForStock },
      completedAt: new Date(),
      completedBy: actorId ?? null,
    });
  } else {
    await upsertStep(db, dealershipId, 'VEHICLES', {
      status: 'IN_PROGRESS',
      ownerKind: 'DEALER',
      incompleteReason: defaultIncomplete('VEHICLES'),
    });
  }

  if (channelsReady) {
    await upsertStep(db, dealershipId, 'CHANNELS', {
      status: 'COMPLETE',
      ownerKind: 'OUR_TEAM',
      incompleteReason: null,
      evidenceJson: { autopilotPreference: dealer.autopilotPreference },
      completedAt: new Date(),
      completedBy: actorId ?? null,
    });
  } else {
    await upsertStep(db, dealershipId, 'CHANNELS', {
      status: 'IN_PROGRESS',
      ownerKind: 'OUR_TEAM',
      incompleteReason: defaultIncomplete('CHANNELS'),
    });
  }

  const readyForHandoff = hasOwnerAccess && vehiclesReady && channelsReady;
  if (dealer.handoffCompletedAt && ownerLoggedIn) {
    await upsertStep(db, dealershipId, 'HANDOFF', {
      status: 'COMPLETE',
      ownerKind: 'OUR_TEAM',
      incompleteReason: null,
      evidenceJson: { ownerLoggedIn, handoffCompletedAt: dealer.handoffCompletedAt.toISOString() },
      completedAt: dealer.handoffCompletedAt,
      completedBy: actorId ?? null,
    });
  } else if (readyForHandoff && !ownerLoggedIn) {
    await upsertStep(db, dealershipId, 'HANDOFF', {
      status: 'IN_PROGRESS',
      ownerKind: 'DEALER',
      incompleteReason: 'Owner has not signed in yet',
    });
  } else if (readyForHandoff) {
    await upsertStep(db, dealershipId, 'HANDOFF', {
      status: 'IN_PROGRESS',
      ownerKind: 'OUR_TEAM',
      incompleteReason: 'Verify distribution readiness and complete handoff',
    });
  } else {
    await upsertStep(db, dealershipId, 'HANDOFF', {
      status: 'NOT_STARTED',
      ownerKind: 'OUR_TEAM',
      incompleteReason: defaultIncomplete('HANDOFF'),
    });
  }

  await syncLifecycle(db, dealershipId, {
    ownerReady: hasOwnerAccess,
    vehiclesReady,
    channelsReady,
    ownerLoggedIn,
    handoffComplete: Boolean(dealer.handoffCompletedAt && ownerLoggedIn),
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
    ownerReady: boolean;
    vehiclesReady: boolean;
    channelsReady: boolean;
    ownerLoggedIn: boolean;
    handoffComplete: boolean;
  },
): Promise<void> {
  const current = await db.dealershipProfile.findUnique({
    where: { id: dealershipId },
    select: { lifecycleStatus: true },
  });
  if (!current) return;
  if (current.lifecycleStatus === 'PAUSED' || current.lifecycleStatus === 'ARCHIVED') return;

  let lifecycleStatus = current.lifecycleStatus;
  if (flags.handoffComplete) lifecycleStatus = 'ACTIVE';
  else if (flags.ownerReady && flags.vehiclesReady && flags.channelsReady) lifecycleStatus = 'READY_TO_LAUNCH';
  else lifecycleStatus = 'SETTING_UP';

  if (lifecycleStatus !== current.lifecycleStatus) {
    await db.dealershipProfile.update({
      where: { id: dealershipId },
      data: { lifecycleStatus },
    });
  }
}

export async function completeHandoff(
  db: Db,
  dealershipId: string,
  actor: { id: string; email: string },
): Promise<OnboardingSnapshot> {
  const snapshot = await refreshOnboarding(db, dealershipId, actor.id);
  const access = snapshot.steps.find((step) => step.stepKey === 'ACCESS');
  const vehicles = snapshot.steps.find((step) => step.stepKey === 'VEHICLES');
  const channels = snapshot.steps.find((step) => step.stepKey === 'CHANNELS');
  if (access?.status !== 'COMPLETE' || vehicles?.status !== 'COMPLETE' || channels?.status !== 'COMPLETE') {
    throw new HttpError(409, snapshot.nextStep?.incompleteReason ?? 'Onboarding is not ready for handoff');
  }

  const owner = await db.operatorDealerAccess.findFirst({
    where: { dealershipId, accessRole: 'DEALER_OWNER' },
    select: { operator: { select: { firstLoginAt: true, lastLoginAt: true } } },
  });
  const ownerLoggedIn = Boolean(owner?.operator.firstLoginAt ?? owner?.operator.lastLoginAt);
  if (!ownerLoggedIn) {
    throw new HttpError(409, 'Handoff requires the owner to have signed in');
  }

  await db.dealershipProfile.update({
    where: { id: dealershipId },
    data: {
      handoffCompletedAt: new Date(),
      handoffCompletedBy: actor.id,
      launchCompletedAt: new Date(),
      lifecycleStatus: 'ACTIVE',
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
