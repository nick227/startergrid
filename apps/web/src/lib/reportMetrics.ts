export type ReportMetricTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

export type ReportMetric = {
  label: string;
  value: string | number;
  tone?: ReportMetricTone;
};

export const METRIC_TONE_CLASS: Record<ReportMetricTone, string> = {
  default: 'text-ink-heading',
  info: 'text-navy-800',
  success: 'text-status-success-text',
  warning: 'text-status-warning-text',
  danger: 'text-status-error-text',
};
