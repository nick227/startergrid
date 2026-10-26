import type {
  OnboardingStepKey,
  OnboardingStepStatus,
  Prisma,
  PrismaClient,
  TaskOwnerKind,
} from '@prisma/client';

export const ONBOARDING_STEP_KEYS: OnboardingStepKey[] = [
  'CREATE', 'ACCESS', 'VEHICLES', 'CHANNELS', 'HANDOFF',
];

type Db = PrismaClient | Prisma.TransactionClient;

export async function seedOnboardingSteps(
  db: Db,
  dealershipId: string,
  actorId: string | null,
): Promise<void> {
  await db.dealershipOnboardingStep.createMany({
    data: ONBOARDING_STEP_KEYS.map((stepKey) => ({
      dealershipId,
      stepKey,
      status: stepKey === 'CREATE' ? 'COMPLETE' : 'NOT_STARTED',
      ownerKind: stepKey === 'CREATE' ? 'OUR_TEAM' : defaultOwner(stepKey),
      ownerOperatorId: stepKey === 'CREATE' ? actorId : null,
      completedAt: stepKey === 'CREATE' ? new Date() : null,
      completedBy: stepKey === 'CREATE' ? actorId : null,
      incompleteReason: stepKey === 'CREATE' ? null : defaultIncomplete(stepKey),
    })),
  });
}

export function defaultOwner(stepKey: OnboardingStepKey): TaskOwnerKind {
  if (stepKey === 'VEHICLES') return 'DEALER';
  return 'OUR_TEAM';
}

export function defaultIncomplete(stepKey: OnboardingStepKey): string {
  switch (stepKey) {
    case 'CREATE': return '';
    case 'ACCESS': return 'Invite the dealership owner or issue a temporary login';
    case 'VEHICLES': return 'Add stock before launch; waiting for stock keeps setup open';
    case 'CHANNELS': return 'Verify an eligible published vehicle on Auto Marketplace';
    case 'HANDOFF': return 'Owner must sign in and a marketplace inquiry must reach the shared inbox';
  }
}

export type StepPatch = {
  status: OnboardingStepStatus;
  ownerKind: TaskOwnerKind;
  incompleteReason: string | null;
  evidenceJson?: Prisma.InputJsonValue;
  completedAt?: Date | null;
  completedBy?: string | null;
};

/**
 * Writes a step derived from evidence. Completion history is immutable while the milestone
 * holds: re-deriving a step that is already COMPLETE (every record read does this) keeps its
 * original completedAt, completedBy and evidence. Only a real change of status clears or
 * re-records it. Unchanged steps are not written at all.
 */
export async function upsertStep(
  db: Db,
  dealershipId: string,
  stepKey: OnboardingStepKey,
  patch: StepPatch,
): Promise<void> {
  const where = { dealershipId_stepKey: { dealershipId, stepKey } };
  const existing = await db.dealershipOnboardingStep.findUnique({
    where,
    select: { status: true, ownerKind: true, incompleteReason: true, evidenceJson: true, completedAt: true },
  });
  const sameGuidance = existing?.ownerKind === patch.ownerKind && existing.incompleteReason === patch.incompleteReason;

  if (patch.status === 'COMPLETE' && existing?.status === 'COMPLETE' && existing.completedAt) {
    if (!sameGuidance) {
      await db.dealershipOnboardingStep.update({
        where,
        data: { ownerKind: patch.ownerKind, incompleteReason: patch.incompleteReason },
      });
    }
    return;
  }

  const state = patch.status === 'COMPLETE' ? patch : { ...patch, completedAt: null, completedBy: null };
  if (existing && patch.status !== 'COMPLETE' && existing.status === patch.status && sameGuidance
    && existing.completedAt === null
    && JSON.stringify(existing.evidenceJson ?? null) === JSON.stringify(patch.evidenceJson ?? null)) {
    return;
  }
  await db.dealershipOnboardingStep.upsert({
    where,
    create: {
      dealershipId,
      stepKey,
      ...state,
    },
    update: state,
  });
}
