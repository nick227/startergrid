import type { PlatformAccountDetail } from './types.ts';
import { timeAgo } from './timeAgo.ts';

export type ValidationState = 'HEALTHY' | 'FAILED' | 'NOT_TESTED';

export type ValidationBadge = {
  state: ValidationState;
  label: string;
  pillClass: string;
};

export type ValidationFeedback = {
  state: ValidationState;
  title: string;
  message: string;
  actionableHint?: string;
  lastValidatedLabel?: string;
};

/**
 * Derives the validation state from the account details.
 */
export function getValidationState(account: PlatformAccountDetail | null | undefined): ValidationState {
  if (!account) return 'NOT_TESTED';
  
  // If we have a successful test on record
  if (account.highestConfirmedLevel === 'CONNECTION_TESTED' && account.state !== 'FAILED') {
    return 'HEALTHY';
  }
  
  if (account.state === 'READY' || account.state === 'ACTIVE') {
    return 'HEALTHY';
  }

  if (account.state === 'FAILED' || account.lastValidationStatus === 'FAILED') {
    return 'FAILED';
  }

  return 'NOT_TESTED';
}

/**
 * Returns a small badge config for inline rows (e.g. ChannelList).
 */
export function getValidationBadge(account: PlatformAccountDetail | null | undefined): ValidationBadge {
  const state = getValidationState(account);
  
  switch (state) {
    case 'HEALTHY':
      return {
        state,
        label: 'Tested & Ready',
        pillClass: 'bg-status-success-bg text-status-success-text border-status-success-border',
      };
    case 'FAILED':
      return {
        state,
        label: 'Validation Failed',
        pillClass: 'bg-status-error-bg text-status-error-text border-status-error-border',
      };
    case 'NOT_TESTED':
    default:
      return {
        state,
        label: 'Not Tested',
        pillClass: 'bg-silver-100 text-ink-muted border-silver-200',
      };
  }
}

/**
 * Returns detailed feedback for setup panels or triage surfaces.
 */
export function getValidationFeedback(account: PlatformAccountDetail | null | undefined): ValidationFeedback {
  const state = getValidationState(account);
  const lastValidatedLabel = account?.lastValidatedAt ? `Tested ${timeAgo(account.lastValidatedAt)}` : undefined;

  switch (state) {
    case 'HEALTHY':
      return {
        state,
        title: 'Connection Healthy',
        message: 'Credentials have been verified successfully.',
        lastValidatedLabel,
      };
    case 'FAILED':
      return {
        state,
        title: 'Validation Failed',
        message: account?.lastValidationNote || 'The connection could not be established.',
        actionableHint: account?.nextAction || 'Please check your credentials and try again.',
        lastValidatedLabel,
      };
    case 'NOT_TESTED':
    default:
      return {
        state,
        title: 'Validation Needed',
        message: 'Enter your credentials and validate to confirm the connection works.',
        actionableHint: 'Click Validate Connection after entering fields.',
        lastValidatedLabel,
      };
  }
}
