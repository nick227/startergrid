import type { PageExperience } from './pagePrimaryState.ts';
import type { SetupReadiness } from './setupReadiness.ts';

export function destinationExperience(readiness: SetupReadiness): PageExperience {
  if (readiness.severity === 'critical') return 'attention';
  if (readiness.severity === 'neutral') return 'empty';
  if (readiness.severity === 'warning' || readiness.severity === 'info') return 'setup';
  return 'running';
}

export function destinationWhy(readiness: SetupReadiness, name: string): string {
  if (readiness.validationSummary) return readiness.validationSummary;
  if (readiness.partnerAcceptanceNote) {
    return `${name} has the details. They still have to accept before listings can appear.`;
  }
  if (readiness.nextAction === 'Connect' || readiness.nextAction === 'Sign in again') {
    return `Sign in with ${name}. StarterGrid never sees your password. After you connect, ready vehicles can be sent here.`;
  }
  if (readiness.nextAction) {
    return `Finish this and ready vehicles can be sent to ${name}. Connected does not mean a listing is live yet.`;
  }
  return `Ready vehicles can be sent to ${name}. Connected does not mean a listing is live yet.`;
}

export function channelCardCopy(input: {
  connected: boolean;
  hasErrors: boolean;
  sentCount: number;
  firstParty: boolean;
}): { status: string; description: string } {
  if (input.hasErrors) {
    return {
      status: 'Needs a fix',
      description: 'Until this is fixed, vehicles will not update here.',
    };
  }
  if (!input.connected) {
    return {
      status: 'Not connected',
      description: input.firstParty
        ? 'Your StarterGrid storefront. Connect it to send ready vehicles here.'
        : 'Connect this only if you advertise here.',
    };
  }
  if (input.sentCount > 0) {
    return {
      status: `${input.sentCount} sent`,
      description: input.firstParty
        ? 'Your StarterGrid storefront. Sent is not a confirmation they already show it.'
        : 'We can send vehicles here. Sent is not a confirmation they already show it.',
    };
  }
  return {
    status: 'Connected',
    description: input.firstParty
      ? 'Your StarterGrid storefront. Ready vehicles can be sent here.'
      : 'We can send vehicles here. Connected does not mean listings are already on the site.',
  };
}
