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
    case 'VEHICLES': return 'Add at least one vehicle or mark waiting for stock';
    case 'CHANNELS': return 'Record Autopilot preference and agreed destinations';
    case 'HANDOFF': return 'Owner must sign in and launch checks must pass';
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

export async function upsertStep(
  db: Db,
  dealershipId: string,
  stepKey: OnboardingStepKey,
  patch: StepPatch,
): Promise<void> {
  await db.dealershipOnboardingStep.upsert({
    where: { dealershipId_stepKey: { dealershipId, stepKey } },
    create: {
      dealershipId,
      stepKey,
      ...patch,
    },
    update: patch,
  });
}
