type StatusConfig = {
  label: string;
  cls: string;
};

export const HEALTH_CFG: Record<string, StatusConfig> = {
  healthy:   { label: 'Healthy',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  flowing:   { label: 'Flowing',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  valid:     { label: 'Valid',      cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  backed_up: { label: 'Backed Up', cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  invalid:   { label: 'Invalid',   cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  unhealthy: { label: 'Unhealthy', cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  unknown:   { label: 'Not Checked', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
};

export const HEALTH_DEFAULT: StatusConfig = {
  label: 'Unknown',
  cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border',
};

export const READINESS_CFG: Record<string, StatusConfig> = {
  valid:   { label: 'Pass',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  PASS:    { label: 'Pass',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  WARNING: { label: 'Warning', cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  UNKNOWN: { label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
  invalid: { label: 'Fail',   cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
};

export const READINESS_DEFAULT: StatusConfig = {
  label: 'Unknown',
  cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border',
};

export const VALIDATION_CFG: Record<string, StatusConfig> = {
  VALID:              { label: 'Valid',               cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  NOT_CONFIGURED:     { label: 'Not Configured',      cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  READY_TO_VALIDATE:  { label: 'Ready to Validate',   cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
  VALIDATION_FAILED:  { label: 'Validation Failed',   cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  MANUAL_SETUP:       { label: 'Manual Setup',        cls: 'bg-surface-inset text-ink-muted border-silver-200' },
  INTERNAL:           { label: 'Internal',            cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  CONTRACT_MISSING:   { label: 'Contract Missing',    cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
};

export const VALIDATION_DEFAULT: StatusConfig = {
  label: 'Contract Missing',
  cls: 'bg-surface-inset text-ink-faint border-silver-200',
};

export const MATURITY_CFG: Record<string, StatusConfig> = {
  PRODUCTION_READY: { label: 'Production Ready', cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  BETA:             { label: 'Beta',              cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
  ALPHA:            { label: 'Alpha',             cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
};

export const MATURITY_DEFAULT: StatusConfig = {
  label: 'Unknown',
  cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border',
};
