import { describe, expect, it } from 'vitest';
import { handoffReadiness, recordNextAction } from './dealershipNextStep.ts';

const owner = { accessRole: 'DEALER_OWNER', isActive: true, firstLoginAt: '2026-10-26T08:00:00Z', lastLoginAt: null };
const base = {
  lifecycleStatus: 'ACTIVE', invitations: [], people: [owner],
  onboardingSteps: ['CREATE', 'ACCESS', 'VEHICLES', 'CHANNELS'].map(key => ({ key, status: 'COMPLETE' })),
};

describe('onboarding evidence guidance', () => {
  it('routes a missing inquiry to Leads instead of offering handoff', () => {
    const record = { ...base, onboardingSteps: [...base.onboardingSteps, { key: 'HANDOFF', status: 'BLOCKED', blockingReason: 'Verify a marketplace inquiry reaches the shared inbox' }] };
    expect(recordNextAction(record).kind).toBe('reviewLeads');
    expect(handoffReadiness(record)).toEqual({ ready: false, missing: ['Verify a marketplace inquiry reaches the shared inbox'] });
  });
  it('does not confuse an Autopilot decision with publication', () => {
    const record = { ...base, onboardingSteps: base.onboardingSteps.map(s => s.key === 'CHANNELS' ? { ...s, status: 'IN_PROGRESS' } : s) };
    expect(recordNextAction(record).label).toBe('Verify a live listing');
    expect(handoffReadiness(record).ready).toBe(false);
  });
  it('allows handoff only when the server has cleared the evidence checks', () => {
    const record = { ...base, onboardingSteps: [...base.onboardingSteps, { key: 'HANDOFF', status: 'IN_PROGRESS' }] };
    expect(handoffReadiness(record).ready).toBe(true);
    expect(recordNextAction(record).kind).toBe('completeHandoff');
    expect(handoffReadiness({ ...record, people: [{ ...owner, isActive: false }] }).ready).toBe(false);
    expect(handoffReadiness({ ...record, people: [{ ...owner, mustChangePassword: true }] }).ready).toBe(false);
  });
});
