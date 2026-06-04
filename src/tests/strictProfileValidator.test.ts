import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateStrictPlatformProfile, defaultStrictProfilePolicy } from '../validators/strictPlatformProfileValidator.js';
import type { PlatformProfileSeed } from '../lib/types.js';

const todayIso = new Date().toISOString().split('T')[0];
const staleDate = '2020-01-01';

const baseProfile: PlatformProfileSeed = {
  slug: 'test-platform',
  name: 'Test Platform',
  kind: 'MARKETPLACE',
  integrationClass: 'FEEDABLE',
  schemaVersion: '1.0.0',
  lastVerifiedAt: todayIso,
  profileConfidence: 'HIGH',
  needsReview: false,
  sourceNote: 'manual research',
  mockEndpoint: 'mock://test-platform',
  integrationUrls: {
    developerDocsUrl: 'https://docs.test-platform.example.com',
    notes: 'Test fixture integration metadata.'
  },
  outputFormat: 'JSON',
  submissionMethods: ['FEED_URL'],
  sourceUrls: ['https://docs.test-platform.example.com'],
  requiredDealershipFields: [],
  requiredVehicleFields: [],
  requiredMediaRules: {},
  testFixtures: {}
};

describe('validateStrictPlatformProfile', () => {
  it('returns no issues for a fresh HIGH confidence profile with source URLs', () => {
    const issues = validateStrictPlatformProfile(baseProfile, defaultStrictProfilePolicy);
    assert.equal(issues.length, 0);
  });

  it('returns FAIL when needsReview is true', () => {
    const issues = validateStrictPlatformProfile({ ...baseProfile, needsReview: true }, defaultStrictProfilePolicy);
    assert.ok(issues.some(i => i.severity === 'FAIL' && i.path.includes('needsReview')));
  });

  it('returns WARN when profile age exceeds maxFreshnessDays', () => {
    const issues = validateStrictPlatformProfile({ ...baseProfile, lastVerifiedAt: staleDate }, defaultStrictProfilePolicy);
    assert.ok(issues.some(i => i.severity === 'WARN' && i.path.includes('lastVerifiedAt')));
  });

  it('returns WARN for MEDIUM confidence when warnOnMediumConfidence is enabled', () => {
    const issues = validateStrictPlatformProfile({ ...baseProfile, profileConfidence: 'MEDIUM' }, defaultStrictProfilePolicy);
    assert.ok(issues.some(i => i.severity === 'WARN' && i.path.includes('profileConfidence')));
  });

  it('does not warn on MEDIUM confidence when warnOnMediumConfidence is false', () => {
    const profile = { ...baseProfile, profileConfidence: 'MEDIUM' as const };
    const issues = validateStrictPlatformProfile(profile, { ...defaultStrictProfilePolicy, warnOnMediumConfidence: false });
    assert.equal(issues.filter(i => i.path.includes('profileConfidence')).length, 0);
  });

  it('returns WARN when sourceUrls is empty and requireSourceUrls is true', () => {
    const issues = validateStrictPlatformProfile({ ...baseProfile, sourceUrls: [] }, defaultStrictProfilePolicy);
    assert.ok(issues.some(i => i.severity === 'WARN' && i.path.includes('sourceUrls')));
  });

  it('does not warn about sourceUrls when requireSourceUrls is false', () => {
    const issues = validateStrictPlatformProfile(
      { ...baseProfile, sourceUrls: [] },
      { ...defaultStrictProfilePolicy, requireSourceUrls: false }
    );
    assert.equal(issues.filter(i => i.path.includes('sourceUrls')).length, 0);
  });

  it('returns WARN for MARKETPLACE with assisted-only submissions', () => {
    const profile = { ...baseProfile, submissionMethods: ['MANUAL_REP' as const, 'MOCK_EMAIL' as const] };
    const issues = validateStrictPlatformProfile(profile, defaultStrictProfilePolicy);
    assert.ok(issues.some(i => i.severity === 'WARN' && i.path.includes('submissionMethods')));
  });

  it('does not warn when MARKETPLACE has a self-serve feed alongside assisted methods', () => {
    const profile = { ...baseProfile, submissionMethods: ['MANUAL_REP' as const, 'FEED_URL' as const] };
    const issues = validateStrictPlatformProfile(profile, defaultStrictProfilePolicy);
    assert.equal(issues.filter(i => i.path.includes('submissionMethods')).length, 0);
  });

  it('does not warn about assisted-only for non-MARKETPLACE platforms', () => {
    const profile = { ...baseProfile, kind: 'AD_NETWORK' as const, submissionMethods: ['MOCK_EMAIL' as const] };
    const issues = validateStrictPlatformProfile(profile, defaultStrictProfilePolicy);
    assert.equal(issues.filter(i => i.path.includes('submissionMethods')).length, 0);
  });
});
