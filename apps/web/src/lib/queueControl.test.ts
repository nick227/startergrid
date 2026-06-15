import { describe, expect, it } from 'vitest';
import { formatQueueWhen, queueItemActions } from './queueControl.ts';
import type { QueueItemView } from './types.ts';

function baseItem(overrides: Partial<QueueItemView> = {}): QueueItemView {
  return {
    id: 'q-1',
    assetRef: null,
    assetTitle: null,
    assetId: null,
    platformSlug: 'google-vehicle-ads',
    platformName: 'Google Vehicle Ads',
    integrationClass: 'FEEDABLE',
    triggerKind: 'INITIAL_PUBLISH',
    status: 'SCHEDULED',
    policyMode: 'SCHEDULED',
    priority: 5,
    scheduledFor: null,
    blockReason: null,
    approvalRequiredReason: null,
    holdReason: null,
    approvedBy: null,
    sentAt: null,
    attemptCount: 0,
    nextAttemptAt: null,
    claimedBy: null,
    createdAt: new Date().toISOString(),
    accountState: 'ACTIVE',
    outboundEligible: true,
    ineligibleReason: null,
    ...overrides,
  };
}

describe('formatQueueWhen', () => {
  const now = Date.parse('2026-06-15T12:00:00.000Z');

  it('shows Due now for READY real-time rows without scheduledFor', () => {
    expect(
      formatQueueWhen(
        baseItem({ status: 'READY', policyMode: 'REAL_TIME', scheduledFor: null }),
        now,
      ).text,
    ).toBe('Due now');
  });

  it('formats scheduled batch time', () => {
    const when = formatQueueWhen(
      baseItem({ scheduledFor: '2026-06-16T09:00:00.000Z' }),
      now,
    );
    expect(when.text).toContain('Jun');
    expect(when.text).toContain('16');
  });

  it('marks overdue scheduled batches', () => {
    const when = formatQueueWhen(
      baseItem({ scheduledFor: '2026-06-14T09:00:00.000Z' }),
      now,
    );
    expect(when.text).toMatch(/^Overdue · /);
  });

  it('shows retry time for failed items', () => {
    const when = formatQueueWhen(
      baseItem({
        status: 'FAILED',
        nextAttemptAt: '2026-06-15T13:00:00.000Z',
        attemptCount: 1,
      }),
      now,
    );
    expect(when.title).toBe('Automatic retry');
    expect(when.text).toContain('Jun');
  });

  it('shows After approval for approval-gated rows', () => {
    expect(
      formatQueueWhen(baseItem({ status: 'NEEDS_APPROVAL', policyMode: 'APPROVAL_REQUIRED' }), now).text,
    ).toBe('After approval');
  });
});

describe('queueItemActions', () => {
  it('offers Send now for eligible SCHEDULED items', () => {
    const actions = queueItemActions(baseItem());
    expect(actions.some(a => a.kind === 'send-now' && a.label === 'Send now')).toBe(true);
  });

  it('only offers Set up channel for ineligible legacy rows', () => {
    const actions = queueItemActions(
      baseItem({ outboundEligible: false, ineligibleReason: 'Channel not connected' }),
    );
    expect(actions).toEqual([{ kind: 'setup-channel', label: 'Set up channel' }]);
  });
});
