import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildOperationalIssues, __resetIssueLifecycleCacheForTests } from './operationsAdapter.ts';
import type { AdminDealerAttentionItem } from '@/lib/api/admin.ts';

describe('operationsAdapter', () => {
  const mockTriageItem = (overrides: Partial<AdminDealerAttentionItem>): AdminDealerAttentionItem => ({
    dealerId: 'dealer-123',
    reason: 'auth_failed',
    severity: 'critical',
    type: 'platform',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    // The adapter's issue-lifecycle cache is module-scoped (persists across fetches by
    // design), so tests must reset it explicitly or they leak state into each other.
    __resetIssueLifecycleCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes fragmented error strings into stable reason codes', () => {
    const items = [
      mockTriageItem({ platformSlug: 'facebook', reason: 'User token expired!' }),
      mockTriageItem({ platformSlug: 'facebook', reason: 'Auth failure.' }),
    ];

    const issues = buildOperationalIssues(items, []);

    // Both should map to 'auth_failure' and merge into one incident
    expect(issues).toHaveLength(1);
    expect(issues[0].affectedCount).toBe(2);
  });

  it('splits issues by dealerId', () => {
    const items = [
      mockTriageItem({ dealerId: 'dealer-A', platformSlug: 'facebook', reason: 'auth_failed' }),
      mockTriageItem({ dealerId: 'dealer-B', platformSlug: 'facebook', reason: 'auth_failed' }),
    ];

    const issues = buildOperationalIssues(items, []);

    expect(issues).toHaveLength(2);
  });

  it('treats incident as new if it recurs after the 24h threshold', () => {
    const items = [
      mockTriageItem({ dealerId: 'dealer-123', platformSlug: 'facebook', reason: 'auth_failed' }),
    ];

    const run1 = buildOperationalIssues(items, []);
    const firstSeen1 = run1[0].observedFirstSeenAt;

    // Advance time by 25 hours
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);

    const run2 = buildOperationalIssues(items, []);
    const firstSeen2 = run2[0].observedFirstSeenAt;

    expect(firstSeen1).not.toBe(firstSeen2); // It should be treated as a new recurrence
    expect(run2[0].isResolved).toBe(false);
  });

  it('marks an incident as resolved if it disappears from the payload, but keeps it in history', () => {
    const items = [
      mockTriageItem({ dealerId: 'dealer-123', platformSlug: 'facebook', reason: 'auth_failed' }),
    ];

    // Issue is active
    const run1 = buildOperationalIssues(items, []);
    expect(run1[0].isResolved).toBe(false);
    expect(run1).toHaveLength(1);

    // Issue disappears (e.g. backend no longer reports it)
    const run2 = buildOperationalIssues([], []);
    
    expect(run2).toHaveLength(1);
    expect(run2[0].isResolved).toBe(true);
    expect(run2[0].resolvedAt).toBeDefined();
    expect(run2[0].status).toBe('resolved');
  });
});
