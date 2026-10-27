import type { PlatformPublishResult, PlatformAccountDetail } from './types.ts';

export type ReadinessSeverity = 'neutral' | 'info' | 'warning' | 'critical' | 'success';

export type SetupReadiness = {
  statusLabel: string;
  severity: ReadinessSeverity;
  nextAction: string | null;
  missingRequiredFields: string[];
  missingRequiredSecrets: string[];
  setupProgress: string | null;
  validationSummary: string | null;
  partnerAcceptanceNote: string | null;
};

export function getSetupReadiness(
  platform: PlatformPublishResult,
  account: PlatformAccountDetail | null
): SetupReadiness {
  // OWNED channels are always available — no external account setup required
  if (platform.integrationClass === 'OWNED') {
    if (platform.state === 'Blocked' || platform.readiness === 'RED') {
      return {
        statusLabel: 'Inventory needs attention',
        severity: 'critical',
        nextAction: 'Fix inventory',
        missingRequiredFields: [],
        missingRequiredSecrets: [],
        setupProgress: null,
        validationSummary: platform.detail || 'One or more ready listings are missing required marketplace data.',
        partnerAcceptanceNote: null,
      };
    }

    if (platform.state === 'Failed') {
      return {
        statusLabel: 'Last update did not go through',
        severity: 'critical',
        nextAction: 'Retry update',
        missingRequiredFields: [],
        missingRequiredSecrets: [],
        setupProgress: null,
        validationSummary: platform.detail || 'The last update did not complete.',
        partnerAcceptanceNote: null,
      };
    }

    return {
      statusLabel: platform.state === 'Active' ? 'Connected' : 'Ready to send',
      severity: 'success',
      nextAction: null,
      missingRequiredFields: [],
      missingRequiredSecrets: [],
      setupProgress: null,
      validationSummary: null,
      partnerAcceptanceNote: null,
    };
  }

  const isOauth = platform.connectionType === 'OAUTH';
  const isPartnerFeed = platform.connectionType === 'PARTNER_FEED';

  const defaultMissingNonSecrets: string[] = [];
  const defaultMissingSecrets: string[] = [];
  
  if (!account) {
    return {
      statusLabel: 'Not connected',
      severity: 'neutral',
      nextAction: isOauth ? 'Connect' : 'Add the details they need',
      missingRequiredFields: defaultMissingNonSecrets,
      missingRequiredSecrets: defaultMissingSecrets,
      setupProgress: null,
      validationSummary: null,
      partnerAcceptanceNote: null,
    };
  }

  const fields = account.connectionFields || [];
  let providedCount = 0;
  const missingNonSecrets: string[] = [];
  const missingSecrets: string[] = [];

  for (const field of fields) {
    const hasValue = account.connectionConfig && account.connectionConfig[field.field] !== undefined && account.connectionConfig[field.field] !== null && account.connectionConfig[field.field] !== '';
    if (hasValue) {
      providedCount++;
    } else {
      if (field.isSecret) {
        missingSecrets.push(field.label);
      } else {
        missingNonSecrets.push(field.label);
      }
    }
  }

  const totalFields = fields.length;
  const setupProgress = totalFields > 0 ? `${providedCount} of ${totalFields} details filled in` : null;

  // Account State based Evaluation
  // account.state can be: 'ACCOUNT_NEEDED', 'CREDENTIALS_NEEDED', 'READY', 'FAILED', 'ACTIVE', 'NOT_STARTED'
  const acctState = account.state || 'NOT_STARTED';
  const pubState = platform.state || 'NOT_STARTED';

  let statusLabel = 'Unknown';
  let severity: ReadinessSeverity = 'neutral';
  let nextAction: string | null = null;
  let partnerAcceptanceNote: string | null = null;

  if (isOauth) {
    if (account.oauthConnected && !account.oauthExpired) {
      if (pubState === 'Active') {
        statusLabel = 'Connected';
        severity = 'success';
      } else {
        statusLabel = 'Ready to send';
        severity = 'success';
      }
    } else if (account.oauthExpired) {
      statusLabel = 'Sign-in expired';
      severity = 'critical';
      nextAction = 'Sign in again';
    } else {
      statusLabel = 'Not connected';
      severity = 'neutral';
      nextAction = 'Connect';
    }
  } else {
    // Partner or Direct integration
    if (acctState === 'NOT_STARTED' || (!missingNonSecrets.length && !missingSecrets.length && providedCount === 0 && acctState !== 'READY' && acctState !== 'FAILED')) {
      statusLabel = 'Not connected';
      severity = 'neutral';
      nextAction = 'Add the details they need';
    } else if (missingNonSecrets.length > 0 || missingSecrets.length > 0 || acctState === 'ACCOUNT_NEEDED' || acctState === 'CREDENTIALS_NEEDED') {
      statusLabel = missingSecrets.length > 0 ? 'Sign-in needed' : 'Needs a few details';
      severity = 'warning';
      nextAction = 'Add the details they need';
    } else if (acctState === 'FAILED') {
      statusLabel = 'Could not connect';
      severity = 'critical';
      nextAction = 'Check this connection';
    } else if (acctState === 'READY' && pubState !== 'Active') {
      if (account.highestConfirmedLevel === 'CONNECTION_TESTED') {
        statusLabel = isPartnerFeed ? 'Waiting on partner' : 'Connection checked';
        severity = isPartnerFeed ? 'info' : 'success';
        partnerAcceptanceNote = isPartnerFeed ? 'Waiting on partner acceptance' : null;
      } else {
        statusLabel = 'Ready to check';
        severity = 'info';
        nextAction = 'Check this connection';
      }
    } else if (pubState === 'Active') {
      statusLabel = 'Connected';
      severity = 'success';
    } else {
      statusLabel = 'Ready to send';
      severity = 'success';
    }
  }

  const validationSummary = account.lastValidationNote || null;

  return {
    statusLabel,
    severity,
    nextAction,
    missingRequiredFields: missingNonSecrets,
    missingRequiredSecrets: missingSecrets,
    setupProgress,
    validationSummary,
    partnerAcceptanceNote,
  };
}

export function severityToPill(severity: ReadinessSeverity): string {
  switch (severity) {
    case 'success':
      return 'border-status-success-border bg-status-success-bg text-status-success-text';
    case 'critical':
      return 'border-status-error-border bg-status-error-bg text-status-error-text';
    case 'warning':
      return 'border-status-warning-border bg-status-warning-bg text-status-warning-text';
    case 'info':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'neutral':
    default:
      return 'border-silver-200 bg-silver-100 text-ink-muted';
  }
}
