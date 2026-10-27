import { describe, it, expect } from 'vitest';
import { getSetupReadiness } from './setupReadiness.ts';
import type { PlatformPublishResult, PlatformAccountDetail } from './types.ts';

function createMockPlatform(overrides?: Partial<PlatformPublishResult>): PlatformPublishResult {
  return {
    platformSlug: 'test',
    platformName: 'Test Platform',
    integrationClass: 'MARKETPLACE',
    supportedCategories: [],
    readiness: 'gray',
    state: 'NOT_STARTED' as any,
    detail: '',
    scheduledFor: null,
    queueItemId: null,
    artifactPath: null,
    accountState: null,
    catalogSync: false,
    socialPosting: false,
    marketplaceListing: true,
    partnerFeed: false,
    leadSync: false,
    connectionType: 'API',
    integrationMaturity: 'BETA',
    regions: [],
    ...overrides,
  };
}

function createMockAccount(overrides?: Partial<PlatformAccountDetail>): PlatformAccountDetail {
  return {
    id: '1',
    platformSlug: 'test',
    platformName: 'Test Platform',
    integrationClass: 'MARKETPLACE',
    state: 'NOT_STARTED',
    accountId: null,
    platformRepName: null,
    platformRepEmail: null,
    membershipStatus: null,
    nextAction: null,
    nextActionOwner: null,
    notes: null,
    connectionConfig: {},
    lastValidationStatus: null,
    lastValidationNote: null,
    lastValidatedAt: null,
    highestConfirmedLevel: null,
    lastChecked: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readinessScore: 0,
    oauthProvider: null,
    oauthConnected: false,
    oauthExpired: false,
    tier: null,
    partnerSignup: null,
    socialPosting: false,
    catalogSync: false,
    marketplaceListing: true,
    partnerFeed: false,
    leadSync: false,
    connectionType: 'API',
    integrationMaturity: 'BETA',
    liveValidationNote: null,
    integrationUrls: null,
    requirementsConfidence: null,
    sourceNote: null,
    requiredDealershipFields: [],
    requiredVehicleFields: [],
    profileConfidence: null,
    ...overrides,
  };
}

describe('setupReadiness', () => {
  it('covers OAuth not connected', () => {
    const platform = createMockPlatform({ connectionType: 'OAUTH' });
    const account = createMockAccount({ oauthConnected: false, oauthExpired: false });
    const readiness = getSetupReadiness(platform, account);
    expect(readiness.statusLabel).toBe('Not connected');
    expect(readiness.severity).toBe('neutral');
    expect(readiness.nextAction).toBe('Connect');
  });

  it('covers partner platform missing required config', () => {
    const platform = createMockPlatform({ connectionType: 'PARTNER_FEED', partnerFeed: true });
    const account = createMockAccount({
      connectionFields: [{ field: 'partnerId', label: 'Partner ID', isSecret: false }],
      connectionConfig: {},
      state: 'ACCOUNT_NEEDED',
    });
    const readiness = getSetupReadiness(platform, account);
    expect(readiness.statusLabel).toBe('Needs a few details');
    expect(readiness.severity).toBe('warning');
    expect(readiness.nextAction).toBe('Add the details they need');
    expect(readiness.missingRequiredFields).toContain('Partner ID');
    expect(readiness.setupProgress).toBe('0 of 1 details filled in');
  });

  it('covers missing required secret', () => {
    const platform = createMockPlatform({ connectionType: 'API' });
    const account = createMockAccount({
      connectionFields: [{ field: 'apiKey', label: 'API Key', isSecret: true }],
      connectionConfig: {},
      state: 'CREDENTIALS_NEEDED',
    });
    const readiness = getSetupReadiness(platform, account);
    expect(readiness.statusLabel).toBe('Sign-in needed');
    expect(readiness.severity).toBe('warning');
    expect(readiness.missingRequiredSecrets).toContain('API Key');
  });

  it('covers validation failed', () => {
    const platform = createMockPlatform({ connectionType: 'API' });
    const account = createMockAccount({
      connectionFields: [{ field: 'apiKey', label: 'API Key', isSecret: true }],
      connectionConfig: { apiKey: '********' },
      state: 'FAILED',
      lastValidationNote: 'Invalid API Key',
    });
    const readiness = getSetupReadiness(platform, account);
    expect(readiness.statusLabel).toBe('Could not connect');
    expect(readiness.severity).toBe('critical');
    expect(readiness.nextAction).toBe('Check this connection');
    expect(readiness.validationSummary).toBe('Invalid API Key');
  });

  it('covers connection tested but partner acceptance pending', () => {
    const platform = createMockPlatform({ connectionType: 'PARTNER_FEED' });
    const account = createMockAccount({
      connectionFields: [{ field: 'ftpUser', label: 'FTP User', isSecret: false }],
      connectionConfig: { ftpUser: 'user1' },
      state: 'READY',
      highestConfirmedLevel: 'CONNECTION_TESTED',
    });
    const readiness = getSetupReadiness(platform, account);
    expect(readiness.statusLabel).toBe('Waiting on partner');
    expect(readiness.severity).toBe('info');
    expect(readiness.partnerAcceptanceNote).toBe('Waiting on partner acceptance');
  });

  it('covers ready/active', () => {
    const platform = createMockPlatform({ connectionType: 'API', state: 'Active' as any });
    const account = createMockAccount({
      connectionFields: [{ field: 'apiKey', label: 'API Key', isSecret: true }],
      connectionConfig: { apiKey: '********' },
      state: 'ACTIVE',
      highestConfirmedLevel: 'CONNECTION_TESTED',
    });
    const readiness = getSetupReadiness(platform, account);
    expect(readiness.statusLabel).toBe('Connected');
    expect(readiness.severity).toBe('success');
  });

  it('labels an owned storefront ready to send instead of READY', () => {
    const platform = createMockPlatform({
      integrationClass: 'OWNED',
      connectionType: 'NONE',
      state: 'Ready' as any,
    });
    const readiness = getSetupReadiness(platform, null);
    expect(readiness.statusLabel).toBe('Ready to send');
  });

  it('shows owned marketplace inventory blockers instead of ready', () => {
    const platform = createMockPlatform({
      integrationClass: 'OWNED',
      connectionType: 'NONE',
      state: 'Blocked' as any,
      readiness: 'RED' as any,
      detail: 'Blocked: Vehicle MES-2002 needs at least one photo before it can publish',
    });
    const readiness = getSetupReadiness(platform, null);
    expect(readiness.statusLabel).toBe('Inventory needs attention');
    expect(readiness.severity).toBe('critical');
    expect(readiness.nextAction).toBe('Fix inventory');
    expect(readiness.validationSummary).toContain('MES-2002');
  });
});
