import type { PrismaClient } from '@prisma/client';
import { upsertDefaultPlatformAccounts, upsertDefaultSyncPolicies } from '../publishing/syncPolicyService.js';
import { recordDealershipActivity } from './activityService.js';
import { refreshOnboarding } from './onboardingService.js';
import { channelSetupStatus } from './channelSetupStatus.js';

export { channelSetupStatus };


export type ChannelSetupResult = {
  status: 'READY' | 'NEEDS_ATTENTION';
  missing: string[];
  /** Short, user-safe reason; the full error stays in the server log. */
  message: string | null;
};

/**
 * Creates the default channel accounts and sync policies. Idempotent: every write is an
 * upsert keyed on (dealershipId, platformSlug), so retrying never duplicates anything.
 * Never throws for provisioning failures; the dealership already exists and the result
 * is reported, recorded in activity, and surfaced as the next onboarding action.
 */
export async function provisionDefaultChannels(
  prisma: PrismaClient,
  dealershipId: string,
  actor: { id: string; email: string } | null,
  options: { retry?: boolean } = {},
): Promise<ChannelSetupResult> {
  let failure: unknown = null;
  try {
    await upsertDefaultSyncPolicies(prisma, dealershipId);
    await upsertDefaultPlatformAccounts(prisma, dealershipId);
  } catch (err) {
    failure = err;
    console.error(`[channelSetup] default channel setup failed for ${dealershipId}:`, err);
  }

  const status = await channelSetupStatus(prisma, dealershipId);
  const result: ChannelSetupResult = status.ready
    ? { status: 'READY', missing: [], message: null }
    : {
      status: 'NEEDS_ATTENTION',
      missing: status.missing,
      message: `Default setup did not finish for ${status.missing.length} destination${status.missing.length === 1 ? '' : 's'}. Retry channel setup.`,
    };

  if (actor && (!status.ready || options.retry)) {
    await recordDealershipActivity(prisma, {
      dealershipId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: status.ready ? 'CHANNEL_SETUP_COMPLETED' : 'CHANNEL_SETUP_INCOMPLETE',
      detail: {
        missingCount: status.missing.length,
        ...(failure ? { error: (failure instanceof Error ? failure.message : String(failure)).slice(0, 200) } : {}),
      },
    });
  }
  await refreshOnboarding(prisma, dealershipId, actor?.id ?? null);
  return result;
}
