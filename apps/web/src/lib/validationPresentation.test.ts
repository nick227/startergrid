import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getValidationState, getValidationBadge, getValidationFeedback } from './validationPresentation.ts';
import type { PlatformAccountDetail } from './types.ts';

describe('validationPresentation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseAccount: PlatformAccountDetail = {
    dealershipId: 'D-1',
    platformSlug: 'test',
    state: 'ACCOUNT_NEEDED',
    connectionFields: [],
    connectionConfig: {},
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    lastChecked: '2026-06-01T00:00:00Z',
    accountId: null,
    platformRepName: null,
    platformRepEmail: null,
    membershipStatus: null,
    nextAction: null,
    notes: null,
    lastValidationStatus: null,
    lastValidationNote: null,
    lastValidatedAt: null,
    highestConfirmedLevel: null,
    readinessScore: 0,
    oauthProvider: null,
    oauthConnected: false,
    oauthExpired: false,
    partnerSignup: null,
  };

  describe('getValidationState', () => {
    it('returns NOT_TESTED for null account', () => {
      expect(getValidationState(null)).toBe('NOT_TESTED');
    });

    it('returns NOT_TESTED for fresh account', () => {
      expect(getValidationState({ ...baseAccount })).toBe('NOT_TESTED');
    });

    it('returns HEALTHY for CONNECTION_TESTED', () => {
      expect(getValidationState({ ...baseAccount, highestConfirmedLevel: 'CONNECTION_TESTED', state: 'READY' })).toBe('HEALTHY');
    });

    it('returns HEALTHY for ACTIVE state', () => {
      expect(getValidationState({ ...baseAccount, state: 'ACTIVE' })).toBe('HEALTHY');
    });

    it('returns FAILED for FAILED state', () => {
      expect(getValidationState({ ...baseAccount, state: 'FAILED' })).toBe('FAILED');
    });

    it('returns FAILED for lastValidationStatus === FAILED', () => {
      expect(getValidationState({ ...baseAccount, lastValidationStatus: 'FAILED', state: 'CREDENTIALS_NEEDED' })).toBe('FAILED');
    });
  });

  describe('getValidationBadge', () => {
    it('returns healthy badge', () => {
      const badge = getValidationBadge({ ...baseAccount, state: 'READY', highestConfirmedLevel: 'CONNECTION_TESTED' });
      expect(badge.label).toBe('Tested & Ready');
      expect(badge.pillClass).toContain('bg-status-success-bg');
    });

    it('returns failed badge', () => {
      const badge = getValidationBadge({ ...baseAccount, state: 'FAILED' });
      expect(badge.label).toBe('Validation Failed');
      expect(badge.pillClass).toContain('bg-status-error-bg');
    });

    it('returns not tested badge', () => {
      const badge = getValidationBadge({ ...baseAccount });
      expect(badge.label).toBe('Not Tested');
      expect(badge.pillClass).toContain('bg-silver-100');
    });
  });

  describe('getValidationFeedback', () => {
    it('returns healthy feedback', () => {
      const feedback = getValidationFeedback({
        ...baseAccount,
        state: 'READY',
        highestConfirmedLevel: 'CONNECTION_TESTED',
        lastValidatedAt: '2026-06-10T11:00:00Z',
      });
      expect(feedback.title).toBe('Connection Healthy');
      expect(feedback.lastValidatedLabel).toBe('Tested 1h ago');
    });

    it('returns failed feedback', () => {
      const feedback = getValidationFeedback({
        ...baseAccount,
        state: 'FAILED',
        lastValidationNote: 'Invalid SFTP password',
        nextAction: 'Check credentials',
        lastValidatedAt: '2026-06-10T11:55:00Z',
      });
      expect(feedback.title).toBe('Validation Failed');
      expect(feedback.message).toBe('Invalid SFTP password');
      expect(feedback.actionableHint).toBe('Check credentials');
      expect(feedback.lastValidatedLabel).toBe('Tested 5m ago');
    });
  });
});
