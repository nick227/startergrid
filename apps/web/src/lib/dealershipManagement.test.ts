import { describe, expect, it } from 'vitest';
import { activitySentence, deliveryMessage, inviteStatus, lifecycleLabel, personStatus, roleLabel } from './dealershipLabels.ts';
import { handoffReadiness, needsOurAction, recordNextAction, summaryNextAction } from './dealershipNextStep.ts';
import { welcomeMessage } from './welcomeMessage.ts';
import { canManagePeople, personActions } from '@/components/people/peoplePermissions.ts';
import { filterDealerships } from '@/components/dealers/DealershipDirectory.tsx';
import { inviteProblem } from '@/pages/AccountSetupPage.tsx';
import type { DealershipPerson, DealershipRecordSummary } from './api/dealershipRecordApi.ts';

const ENUM = /\b[A-Z]{2,}_[A-Z_]+\b/;

const step = (key: string, status = 'COMPLETE') => ({ key, status });
const allSteps = (overrides: Record<string, string> = {}) =>
  ['CREATE', 'ACCESS', 'VEHICLES', 'CHANNELS', 'HANDOFF'].map(k => step(k, overrides[k] ?? 'COMPLETE'));
const person = (over: Partial<DealershipPerson> = {}): DealershipPerson => ({
  accountId: 'p1', email: 'p@x.test', role: 'DEALER_OWNER', accessRole: 'DEALER_OWNER', isActive: true,
  mustChangePassword: false, firstLoginAt: null, lastLoginAt: null, isInternal: false, ...over,
});
const future = new Date(Date.now() + 86_400_000).toISOString();

describe('user-facing copy never shows raw enums', () => {
  it('labels roles, lifecycle and activity in words', () => {
    for (const role of ['DEALER_OWNER', 'DEALER_STAFF', 'INTERNAL_SUPPORT', 'DEALER_OPERATOR', 'OPERATOR', 'SOMETHING_NEW']) {
      expect(roleLabel(role)).not.toMatch(ENUM);
    }
    for (const status of ['DRAFT', 'SETTING_UP', 'READY_TO_LAUNCH', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'NEW_STATE']) {
      expect(lifecycleLabel(status).label).not.toMatch(ENUM);
    }
    for (const action of ['INVITE_CREATED', 'ROLE_CHANGED', 'HANDOFF_COMPLETED', 'AUTOPILOT_PREFERENCE_CHANGED', 'SOME_FUTURE_EVENT']) {
      expect(activitySentence({ action, detail: { email: 'a@b.test', accessRole: 'DEALER_STAFF', to: 'ON' } })).not.toMatch(ENUM);
    }
    expect(activitySentence({ action: 'ROLE_CHANGED', detail: { email: 'a@b.test', accessRole: 'DEALER_OWNER' } }))
      .toBe('Changed a@b.test to Owner');
  });

  it('reports invitation delivery honestly', () => {
    expect(inviteStatus({ deliveryStatus: 'PENDING', expiresAt: future }).label).toBe('Link created · not accepted yet');
    expect(inviteStatus({ deliveryStatus: 'SENT', expiresAt: future }).label).toMatch(/emailed/);
    expect(inviteStatus({ deliveryStatus: 'PENDING', expiresAt: new Date(0).toISOString() }).label).toBe('Link expired');
    expect(deliveryMessage('LINK_ONLY', 'o@x.test')).toMatch(/does not email it/);
    expect(deliveryMessage('EMAIL_FAILED', 'o@x.test', 'bounced')).toMatch(/could not be sent \(bounced\)/);
    expect(personStatus(person({ mustChangePassword: true })).label).toBe('Must choose a new password');
  });
});

describe('one primary next action, from evidence', () => {
  const base = { lifecycleStatus: 'SETTING_UP', invitations: [], people: [] };

  it('asks our team to invite the owner when nobody has access', () => {
    const next = recordNextAction({ ...base, onboardingSteps: allSteps({ ACCESS: 'IN_PROGRESS', HANDOFF: 'NOT_STARTED' }) });
    expect(next).toMatchObject({ kind: 'inviteOwner', owner: 'OUR_TEAM', actionable: true });
  });

  it('waits on the owner while a live invitation exists, and re-invites once it expires', () => {
    const steps = allSteps({ ACCESS: 'IN_PROGRESS' });
    const live = { email: 'o@x.test', accessRole: 'DEALER_OWNER', deliveryStatus: 'PENDING', expiresAt: future };
    expect(recordNextAction({ ...base, onboardingSteps: steps, invitations: [live] })).toMatchObject({ kind: 'shareOwnerLink', owner: 'DEALER' });
    const expired = { ...live, expiresAt: new Date(0).toISOString() };
    expect(recordNextAction({ ...base, onboardingSteps: steps, invitations: [expired] }).label).toBe('Send the owner a new invitation');
  });

  it('never offers handoff before the owner has signed in', () => {
    const steps = allSteps({ HANDOFF: 'IN_PROGRESS' });
    expect(recordNextAction({ ...base, onboardingSteps: steps, people: [person()] })).toMatchObject({ kind: 'waitForOwner', actionable: false });
    expect(recordNextAction({ ...base, onboardingSteps: steps, people: [person({ firstLoginAt: '2026-10-01T00:00:00Z' })] }))
      .toMatchObject({ kind: 'completeHandoff', actionable: true });
    expect(handoffReadiness({ onboardingSteps: steps, people: [person()] }).missing).toEqual(['The owner has signed in']);
  });

  it('has no setup work once live', () => {
    expect(recordNextAction({ ...base, lifecycleStatus: 'ACTIVE', onboardingSteps: allSteps() }).kind).toBe('none');
  });
});

describe('directory filters', () => {
  const row = (over: Partial<DealershipRecordSummary>): DealershipRecordSummary => ({
    id: 'd', legalName: 'Lakeview', dbaName: null, logoUrl: null, businessCategory: 'AUTOMOTIVE', lifecycleStatus: 'SETTING_UP',
    primaryContactEmail: null, autopilotPreference: 'OFF', createdAt: '', lastActivityAt: '', blockedStepCount: 0, nextStep: null, ...over,
  });
  const rows = [
    row({ id: 'mine-invite', internalOwner: { id: 'me', email: 'me@sg.test' }, nextStep: { key: 'ACCESS', label: '', ownerKind: 'OUR_TEAM' } }),
    row({ id: 'waiting-dealer', nextStep: { key: 'VEHICLES', label: '', ownerKind: 'DEALER' } }),
    row({ id: 'live-with-issue', lifecycleStatus: 'ACTIVE' }),
    row({ id: 'live-quiet', lifecycleStatus: 'ACTIVE', legalName: 'Harbor Boats' }),
  ];
  const ctx = { currentUserId: 'me', channelIssues: { 'live-with-issue': 2 }, query: '' };

  it('splits Mine, Needs action, Setting up and All', () => {
    expect(filterDealerships(rows, 'mine', ctx).map(r => r.id)).toEqual(['mine-invite']);
    expect(filterDealerships(rows, 'action', ctx).map(r => r.id)).toEqual(['mine-invite', 'live-with-issue']);
    expect(filterDealerships(rows, 'setup', ctx).map(r => r.id)).toEqual(['mine-invite', 'waiting-dealer']);
    expect(filterDealerships(rows, 'all', { ...ctx, query: 'harbor' }).map(r => r.id)).toEqual(['live-quiet']);
  });

  it('words the next action and its owner', () => {
    expect(summaryNextAction(rows[1]!)).toEqual({ label: 'Add vehicles', owner: 'DEALER' });
    expect(needsOurAction(rows[1]!)).toBe(false);
  });
});

describe('people permissions mirror the server', () => {
  const owner = person({ accountId: 'owner' });
  const staff = person({ accountId: 'staff', accessRole: 'DEALER_STAFF', role: 'DEALER_STAFF' });
  const support = person({ accountId: 'support', accessRole: 'INTERNAL_SUPPORT', role: 'INTERNAL_SUPPORT', isInternal: true });
  const people = [owner, staff, support];

  it('only owners manage people on the dealer side', () => {
    expect(canManagePeople({ kind: 'dealer', userId: 'owner' }, people)).toBe(true);
    expect(canManagePeople({ kind: 'dealer', userId: 'staff' }, people)).toBe(false);
  });

  it('protects internal accounts, yourself, and the last owner', () => {
    const asOwner = { kind: 'dealer' as const, userId: 'owner' };
    expect(personActions(asOwner, support, people)).toMatchObject({ changeRole: false, resetPassword: false, remove: false });
    expect(personActions(asOwner, owner, people).reason).toBe('This is you.');
    expect(personActions({ kind: 'internal', userId: 'support' }, owner, people)).toMatchObject({ changeRole: false, remove: false, resetPassword: true });
    expect(personActions(asOwner, staff, people)).toMatchObject({ changeRole: true, resetPassword: true, remove: true });
  });
});

describe('invitation copy', () => {
  it('builds a welcome message with no placeholder branding or distribution promises', () => {
    const text = welcomeMessage({
      dealershipName: 'Lakeview Motors', email: 'o@x.test', accessRole: 'DEALER_OWNER',
      setupUrl: 'https://app/#/invite/abc', signInUrl: 'https://app/#/login', name: 'Jordan',
    });
    expect(text).toContain('https://app/#/invite/abc');
    expect(text).toContain('Hi Jordan,');
    expect(text).not.toMatch(/Antigravity|Google|Meta|syndicat|automat/i);
  });

  it('explains dead links by cause', () => {
    expect(inviteProblem(410)).toMatch(/expired/);
    expect(inviteProblem(409)).toMatch(/already been used/);
    expect(inviteProblem(404)).toMatch(/not valid/);
  });
});
