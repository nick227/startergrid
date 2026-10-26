import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultPolicy, snapshotHash, idempotencyKey, removalGuard, validatePolicy } from '../services/autopilot/policy.js';
import { qualifyChannel } from '../services/autopilot/capabilities.js';
import { decideDistribution, evidenceStatus, DistributionFailure, failureDecision } from '../services/autopilot/decisions.js';
import type { PublicationEvidence, VehicleSnapshot } from '../services/autopilot/contracts.js';

const now = new Date('2026-10-25T12:00:00Z');
const vehicle: VehicleSnapshot = { dealershipId: 'd', vehicleId: 'v', sourceRevision: 'one', stockNumber: 'S1', year: 2024,
  make: 'Ford', model: 'F150', priceCents: 2_000_000, listingStatus: 'READY', sold: false, removed: false,
  photos: ['https://example.test/photo.jpg'], details: { mileage: 1000 } };
const capability = qualifyChannel('consumer-marketplace', { siteEnabled: true, categorySupported: true, providerConfigured: true, ownedPublisherAvailable: true });
const policy = { ...defaultPolicy('d'), mode: 'ON' as const, includedChannels: ['consumer-marketplace'] };
const input = { policy, vehicle, capability, connected: true, selected: true, previouslyManaged: true,
  verifiedSnapshot: vehicle, massRemovalHeld: false, approvedHash: null };

describe('Autopilot policy and safeguards', () => {
  for (const mode of ['OFF', 'PAUSED'] as const) it(`${mode} prevents automatic upsert`, () => {
    assert.equal(decideDistribution({ ...input, policy: { ...policy, mode } }).dispatch, false);
  });
  it('only qualified lifecycle withdrawals can continue during pause', () => {
    assert.equal(decideDistribution({ ...input, policy: { ...policy, mode: 'PAUSED' }, vehicle: { ...vehicle, sold: true } }).dispatch, true);
    assert.equal(decideDistribution({ ...input, capability: { ...capability, operations: ['UPSERT'] }, vehicle: { ...vehicle, sold: true } }).dispatch, false);
  });
  it('excludes individual vehicles and channels', () => {
    assert.equal(decideDistribution({ ...input, policy: { ...policy, excludedVehicleIds: ['v'] } }).status, 'EXCLUDED');
    assert.equal(decideDistribution({ ...input, selected: false }).status, 'EXCLUDED');
    assert.equal(decideDistribution({ ...input, policy: { ...policy, includedChannels: [] } }).status, 'EXCLUDED');
  });
  it('does not send unqualified destinations even with configured credentials', () => {
    for (const slug of ['google-vehicle-ads', 'meta-automotive-ads', 'ebay-motors', 'boat-trader', 'amazon-kdp', 'not-a-platform']) {
      const c = qualifyChannel(slug, { siteEnabled: true, categorySupported: true, providerConfigured: true, ownedPublisherAvailable: true });
      assert.notEqual(c.qualification, 'VERIFIED_AUTOMATIC');
      assert.ok(validatePolicy({ ...policy, includedChannels: [slug] }, [c]).length);
      assert.equal(decideDistribution({ ...input, capability: c, policy: { ...policy, includedChannels: [slug] } }).dispatch, false);
    }
  });
  it('identifies missing configuration, partner-assisted and manual destinations', () => {
    const ctx = { siteEnabled: true, categorySupported: true, providerConfigured: false, ownedPublisherAvailable: false };
    assert.equal(qualifyChannel('google-vehicle-ads', ctx).qualification, 'UNAVAILABLE');
    assert.equal(qualifyChannel('boat-trader', ctx).qualification, 'PARTNER_ASSISTED');
    assert.equal(qualifyChannel('consumer-marketplace', ctx).qualification, 'UNAVAILABLE');
  });
  it('requires essential information without interpreting readiness as publication', () => {
    assert.equal(decideDistribution({ ...input, vehicle: { ...vehicle, photos: [] } }).status, 'NEEDS_VEHICLE_INFORMATION');
    assert.equal(decideDistribution({ ...input, vehicle: { ...vehicle, priceCents: 0 } }).dispatch, false);
    assert.equal(decideDistribution(input).status, 'PROCESSING');
  });
  it('holds unexpected price changes; approval is bound to exact content', () => {
    const changed = { ...vehicle, priceCents: 10_000 };
    assert.equal(decideDistribution({ ...input, vehicle: changed }).status, 'HELD');
    assert.equal(decideDistribution({ ...input, vehicle: changed, approvedHash: snapshotHash(changed) }).dispatch, true);
    assert.equal(decideDistribution({ ...input, vehicle: changed, approvedHash: snapshotHash(vehicle) }).dispatch, false);
  });
  it('holds dangerous batches but allows an ordinary single sold vehicle', () => {
    assert.equal(removalGuard(1, 1, policy.safeguards), false);
    assert.equal(removalGuard(3, 10, policy.safeguards), true);
    assert.equal(removalGuard(10, 100, policy.safeguards), true);
    assert.equal(decideDistribution({ ...input, vehicle: { ...vehicle, removed: true }, massRemovalHeld: true }).status, 'HELD');
  });
  it('connection expiry stops delivery, recovery reevaluates normally', () => {
    assert.equal(decideDistribution({ ...input, connected: false }).status, 'NEEDS_SETUP');
    assert.equal(decideDistribution(input).dispatch, true);
  });
  it('rejects malformed policy and unsupported activation', () => {
    assert.ok(validatePolicy({ ...policy, safeguards: { ...policy.safeguards, maxAttempts: Number.NaN } }, [capability]).length);
    assert.ok(validatePolicy({ ...policy, includedChannels: [] }, [capability]).length);
  });
  it('deduplicates equal content while detecting photos, details, prices and relisting', () => {
    assert.equal(snapshotHash(vehicle), snapshotHash({ ...vehicle, sourceRevision: 'two' }));
    for (const patch of [{ priceCents: 2_100_000 }, { photos: ['https://example.test/new.jpg'] }, { details: { mileage: 2000 } }, { sold: true }])
      assert.notEqual(snapshotHash(vehicle), snapshotHash({ ...vehicle, ...patch }));
    assert.equal(snapshotHash({ ...vehicle, details: { a: 1, b: 2 } }), snapshotHash({ ...vehicle, details: { b: 2, a: 1 } }));
    assert.notEqual(idempotencyKey('d','v','c',1), idempotencyKey('d','v','c',3), 'A→sold→A must create a new generation');
  });
});

describe('evidence and recovery contracts', () => {
  const expected = { channel: capability.channel, vehicleId: vehicle.vehicleId, desiredHash: snapshotHash(vehicle), operation: 'UPSERT' as const };
  const evidence: PublicationEvidence = { ...expected, observedAt: now.toISOString(), method: 'PROVIDER_READBACK', result: 'LIVE', reference: 'verified-item-1' };
  it('submission acknowledgement alone never reports live', () => {
    assert.equal(evidenceStatus(null, expected, now, 1000), 'SUBMITTED');
    assert.equal(evidenceStatus({ ...evidence, result: 'PENDING' }, expected, now, 1000), 'SUBMITTED');
    assert.equal(evidenceStatus(evidence, expected, now, 1000), 'VERIFIED_LIVE');
  });
  it('rejects stale, mismatched, cross-item or future evidence', () => {
    for (const patch of [{ desiredHash: 'old' }, { vehicleId: 'other' }, { channel: 'other' }, { observedAt: 'invalid' },
      { observedAt: new Date(now.getTime()-2000).toISOString() }, { observedAt: new Date(now.getTime()+1000).toISOString() }])
      assert.equal(evidenceStatus({ ...evidence, ...patch }, expected, now, 1000), 'UNKNOWN');
  });
  it('retries transient provider failure with backoff and respects Retry-After', () => {
    const e = new DistributionFailure('TRANSIENT', 'rate limited', 90_000);
    assert.equal(failureDecision(e, 1, policy, now, 0.5).nextAttemptAt?.getTime(), now.getTime()+90_000);
    assert.equal(failureDecision(e, policy.safeguards.maxAttempts, policy, now).nextAttemptAt, null);
    assert.equal(failureDecision(e, policy.safeguards.maxAttempts, policy, now).owner, 'INTERNAL_SUPPORT');
  });
  it('never blindly retries ambiguous create outcomes or invalid credentials', () => {
    assert.equal(failureDecision(new Error('connection lost after send'), 1, policy, now).status, 'UNKNOWN');
    const expired = failureDecision(new DistributionFailure('CREDENTIALS','expired'),1,policy,now);
    assert.equal(expired.nextAttemptAt, null); assert.equal(expired.owner, 'DEALERSHIP');
  });
});
