import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { completeHandoff, refreshOnboarding } from '../services/dealership/onboardingService.js';
import { platformSlugsForCategory } from '../data/platformCategoryMap.js';

const actor = { id: 'support', email: 'support@example.test' };
// Service-level fixture: model persisted outcomes, rather than accepting caller evidence.
function fixture(options: { live?: boolean; lead?: boolean; waiting?: boolean; ownerLoggedIn?: boolean; activeOwner?: boolean; mustChange?: boolean; preference?: string } = {}) {
  const steps = new Map<string, any>();
  const events: any[] = [];
  const dealer: any = {
    id: 'dealer-a', businessCategory: 'AUTOMOTIVE', lifecycleStatus: 'SETTING_UP',
    waitingForStock: options.waiting ?? false, autopilotPreference: options.preference ?? 'OFF',
    launchCompletedAt: null, handoffCompletedAt: null,
    _count: { vehicles: 1 }, invitations: [],
    operatorAccess: [{ accessRole: 'DEALER_OWNER', operator: {
      isActive: options.activeOwner ?? true, mustChangePassword: options.mustChange ?? false,
      firstLoginAt: options.ownerLoggedIn === false ? null : new Date(), lastLoginAt: null,
    } }],
  };
  const state = { live: options.live ?? false, lead: options.lead ?? false };
  const channels = platformSlugsForCategory('AUTOMOTIVE').map(platformSlug => ({ platformSlug }));
  const db = {
    dealershipProfile: {
      findUnique: async () => ({ ...dealer, onboardingSteps: [...steps.values()] }),
      update: async ({ data }: any) => Object.assign(dealer, data),
    },
    platformAccount: { findMany: async () => channels },
    syncPolicy: { findMany: async () => channels },
    vehicle: { findFirst: async ({ where }: any) => {
      assert.equal(where.dealershipId, dealer.id);
      assert.equal(where.soldAt, null);
      assert.equal(where.removedAt, null);
      assert.equal(where.listingStatus, 'READY');
      assert.deepEqual(where.marketplaceListings, { some: { platformSlug: 'consumer-marketplace', status: 'ACTIVE' } });
      assert.deepEqual(where.channelSelections, { none: { channelKey: 'consumer-marketplace', selected: false } });
      assert.deepEqual(where.media, { some: {} });
      return state.live ? { id: 'vehicle-a' } : null;
    } },
    lead: { findFirst: async ({ where }: any) => {
      assert.equal(where.dealershipId, dealer.id);
      assert.equal(where.vehicle.dealershipId, dealer.id);
      assert.equal(where.platformSlug, 'consumer-marketplace');
      assert.equal(where.source, 'PLATFORM_FORM');
      return state.lead ? { id: 'lead-a' } : null;
    } },
    dealershipOnboardingStep: { upsert: async ({ where, create, update }: any) => {
      const key = where.dealershipId_stepKey.stepKey;
      steps.set(key, { ...(steps.get(key) ?? create), ...update });
      return steps.get(key);
    } },
    dealershipActivityEvent: { create: async ({ data }: any) => { events.push(data); return data; } },
  };
  return { db: db as unknown as PrismaClient, dealer, steps, events, state };
}

describe('evidence-backed onboarding milestones', () => {
  it('rejects preference-only activation and clears stale completion metadata', async () => {
    const f = fixture({ preference: 'ON' });
    f.steps.set('CHANNELS', { stepKey: 'CHANNELS', status: 'COMPLETE', completedAt: new Date(), completedBy: actor.id });
    await assert.rejects(completeHandoff(f.db, 'dealer-a', actor), /Publish an eligible vehicle/);
    assert.equal(f.dealer.lifecycleStatus, 'SETTING_UP');
    assert.equal(f.dealer.launchCompletedAt, null);
    assert.equal(f.dealer.handoffCompletedAt, null);
    assert.equal(f.steps.get('CHANNELS').completedAt, null);
  });

  it('waiting for stock cannot become live or complete handoff', async () => {
    const f = fixture({ waiting: true, live: true, lead: true });
    await assert.rejects(completeHandoff(f.db, 'dealer-a', actor), /Waiting for stock/);
    assert.equal(f.dealer.lifecycleStatus, 'SETTING_UP');
    assert.equal(f.dealer.launchCompletedAt, null);
    assert.equal(f.dealer.handoffCompletedAt, null);
  });

  it('manual publication records launch independently of first login and handoff', async () => {
    const f = fixture({ live: true, ownerLoggedIn: false });
    await refreshOnboarding(f.db, 'dealer-a', actor.id);
    assert.equal(f.dealer.lifecycleStatus, 'ACTIVE');
    assert.ok(f.dealer.launchCompletedAt);
    assert.equal(f.dealer.handoffCompletedAt, null);
    await assert.rejects(completeHandoff(f.db, 'dealer-a', actor), /owner.*sign in/i);
  });

  it('a live listing without a routed inquiry cannot complete handoff', async () => {
    const f = fixture({ live: true });
    await assert.rejects(completeHandoff(f.db, 'dealer-a', actor), /shared Leads inbox/);
    assert.equal(f.steps.get('HANDOFF').status, 'BLOCKED');
    assert.equal(f.dealer.handoffCompletedAt, null);
  });

  it('completes handoff from server evidence without overwriting the launch date; retries are idempotent', async () => {
    const f = fixture({ live: true, lead: true });
    await refreshOnboarding(f.db, 'dealer-a', actor.id);
    const launch = f.dealer.launchCompletedAt;
    await completeHandoff(f.db, 'dealer-a', actor);
    const handoff = f.dealer.handoffCompletedAt;
    await completeHandoff(f.db, 'dealer-a', actor);
    assert.equal(f.dealer.launchCompletedAt, launch);
    assert.equal(f.dealer.handoffCompletedAt, handoff);
    assert.equal(f.events.filter(e => e.action === 'HANDOFF_COMPLETED').length, 1);
    assert.equal(f.steps.get('HANDOFF').evidenceJson.inboxLeadId, 'lead-a');
  });

  for (const options of [{ activeOwner: false }, { mustChange: true }]) {
    it(`does not use an ineligible owner's login as handoff evidence: ${JSON.stringify(options)}`, async () => {
      const f = fixture({ live: true, lead: true, ...options });
      await assert.rejects(completeHandoff(f.db, 'dealer-a', actor));
      assert.equal(f.dealer.handoffCompletedAt, null);
    });
  }

  it('checks all active owners rather than only the first membership', async () => {
    const f = fixture({ live: true, lead: true, ownerLoggedIn: false });
    f.dealer.operatorAccess.push({ accessRole: 'DEALER_OWNER', operator: { isActive: true, mustChangePassword: false, firstLoginAt: new Date() } });
    await completeHandoff(f.db, 'dealer-a', actor);
    assert.ok(f.dealer.handoffCompletedAt);
  });

  it('does not revive paused or archived dealerships through handoff', async () => {
    for (const status of ['PAUSED', 'ARCHIVED']) {
      const f = fixture({ live: true, lead: true });
      f.dealer.lifecycleStatus = status;
      await assert.rejects(completeHandoff(f.db, 'dealer-a', actor), /Resume the dealership/);
      assert.equal(f.dealer.lifecycleStatus, status);
      assert.equal(f.dealer.handoffCompletedAt, null);
    }
  });

  it('rechecks evidence instead of trusting historical timestamps or arbitrary step completion', async () => {
    const f = fixture();
    f.dealer.handoffCompletedAt = new Date();
    f.dealer.launchCompletedAt = new Date();
    f.steps.set('HANDOFF', { stepKey: 'HANDOFF', status: 'COMPLETE', evidenceJson: { verified: true }, completedAt: new Date() });
    await assert.rejects(completeHandoff(f.db, 'dealer-a', actor));
    assert.notEqual(f.steps.get('HANDOFF').status, 'COMPLETE');
    assert.equal(f.steps.get('HANDOFF').completedAt, null);
  });
});
