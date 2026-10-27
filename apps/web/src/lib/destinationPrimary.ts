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
