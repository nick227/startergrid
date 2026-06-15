import { describe, expect, it } from 'vitest';
import { queueItemActions } from './queueControl.ts';
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
