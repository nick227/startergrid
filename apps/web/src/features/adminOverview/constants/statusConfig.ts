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
  valid:            { label: 'Valid',          cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  invalid:          { label: 'Invalid',        cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  'not-configured': { label: 'Not Configured', cls: 'bg-surface-inset text-ink-faint border-silver-200' },
  unsupported:      { label: 'No Live Check',  cls: 'bg-surface-inset text-ink-faint border-silver-200' },
};

export const VALIDATION_DEFAULT: StatusConfig = {
  label: 'Not Checked',
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
