import { describe, expect, it } from 'vitest';
import { formatPendingAge, queueHealthGuidance } from './queueHealthPresentation.ts';

describe('queueHealthGuidance', () => {
  it('explains stalled queue with admin actions', () => {
    const guidance = queueHealthGuidance('backed_up', {
      pending: 12,
      failed: 2,
      retrying: 1,
      held: 3,
      oldestPendingAgeSec: 5400,
      lastSuccessSyncAt: '2026-06-10T08:00:00.000Z',
    });

    expect(guidance.hint).toContain('Scheduler stalled');
    expect(guidance.summary).toContain('1 hour');
    expect(guidance.actions.some(a => a.includes('sync scheduler'))).toBe(true);
    expect(guidance.actions.some(a => a.includes('2 failed'))).toBe(true);
    expect(guidance.actions.some(a => a.includes('3 held'))).toBe(true);
  });

  it('describes flowing queue without actions', () => {
    const guidance = queueHealthGuidance('flowing', {
      pending: 0,
      failed: 0,
      retrying: 0,
      held: 0,
      oldestPendingAgeSec: null,
      lastSuccessSyncAt: null,
    });

    expect(guidance.hint).toContain('No backlog');
    expect(guidance.actions).toHaveLength(0);
  });
});

describe('formatPendingAge', () => {
  it('formats multi-hour ages', () => {
    expect(formatPendingAge(5400)).toBe('1h 30m');
  });
});
