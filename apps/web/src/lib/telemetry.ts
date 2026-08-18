export type RemediationEvent = {
  dealerId: string;
  scope: 'single' | 'bulk';
  action: 'retry' | 'reauth' | 'resolve';
  result: 'success' | 'partial_success' | 'failed' | 'already_resolved';
  issueCategory?: string;
  affectedCount?: number;
  durationMs?: number;
  succeededCount?: number;
  failedCount?: number;
  alreadyResolvedCount?: number;
};

export function trackRemediationEvent(event: RemediationEvent) {
  // In a real application, this would push to an analytics pipeline like Mixpanel or Amplitude.
  // For now, we structure the console log so product analysts can identify the schema boundary.
  console.info('[Telemetry:Remediation]', JSON.stringify(event));
}
