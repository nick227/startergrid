import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateDealershipProfile } from '../validators/dealershipProfileValidator.js';
import type { DealershipPayload } from '../lib/types.js';

const baseDealership: DealershipPayload = {
  legalName: 'Test Motors LLC',
  dealerLicense: 'TX-MOCK-001',
  rooftopAddress: { street: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
  websiteUrl: 'https://testmotors.example.com',
  primaryContact: { name: 'Jane Doe', title: 'Owner', email: 'jane@test.com', phone: '+15125550100' },
  inventorySize: 10,
  desiredChannels: []
};

describe('validateDealershipProfile', () => {
  it('returns no issues for a complete valid dealership', () => {
    const issues = validateDealershipProfile(baseDealership, ['legalName', 'dealerLicense', 'rooftopAddress.city']);
    assert.equal(issues.length, 0);
  });

  it('returns FAIL for a missing required field', () => {
    const dealership = { ...baseDealership, dealerLicense: null };
    const issues = validateDealershipProfile(dealership, ['dealerLicense']);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'FAIL');
  });

  it('returns WARN when inventorySize is zero', () => {
    const issues = validateDealershipProfile({ ...baseDealership, inventorySize: 0 }, []);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'WARN');
    assert.equal(issues[0].path, 'inventorySize');
  });

  it('returns WARN when inventorySize is negative', () => {
    const issues = validateDealershipProfile({ ...baseDealership, inventorySize: -5 }, []);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'WARN');
  });

  it('returns WARN when websiteUrl is not HTTPS', () => {
    const issues = validateDealershipProfile({ ...baseDealership, websiteUrl: 'http://testmotors.example.com' }, []);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'WARN');
    assert.equal(issues[0].path, 'websiteUrl');
  });

  it('does not warn about websiteUrl when it is HTTPS', () => {
    const issues = validateDealershipProfile(baseDealership, []);
    assert.equal(issues.filter(i => i.path === 'websiteUrl').length, 0);
  });

  it('accumulates FAIL and WARN issues without short-circuiting', () => {
    const dealership = { ...baseDealership, dealerLicense: null, inventorySize: 0, websiteUrl: 'http://bad.com' };
    const issues = validateDealershipProfile(dealership, ['dealerLicense']);
    assert.equal(issues.length, 3);
    assert.ok(issues.some(i => i.severity === 'FAIL'));
    assert.ok(issues.filter(i => i.severity === 'WARN').length === 2);
  });
});
