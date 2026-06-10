import { describe, it, expect } from 'vitest';
import {
  leadSyncBlockerReason,
  marketplaceListingBlockerReason,
  socialRowSubtitle,
  hasLiveValidationNote,
} from './platformPanelGuards.ts';

// ── leadSyncBlockerReason ─────────────────────────────────────────────────────

describe('leadSyncBlockerReason', () => {
  it('returns no_oauth when account is null', () => {
    expect(leadSyncBlockerReason(null)).toBe('no_oauth');
  });

  it('returns no_oauth when oauthConnected is false', () => {
    expect(leadSyncBlockerReason({ oauthConnected: false, accountId: 'urn:li:org:123' })).toBe('no_oauth');
  });

  it('returns no_oauth when oauthConnected is false and accountId is missing', () => {
    expect(leadSyncBlockerReason({ oauthConnected: false, accountId: null })).toBe('no_oauth');
  });

  it('returns no_account_id when connected but accountId is null', () => {
    expect(leadSyncBlockerReason({ oauthConnected: true, accountId: null })).toBe('no_account_id');
  });

  it('returns no_account_id when connected but accountId is empty string', () => {
    expect(leadSyncBlockerReason({ oauthConnected: true, accountId: '' })).toBe('no_account_id');
  });

  it('returns null when connected and accountId is present — panel is ready', () => {
    expect(leadSyncBlockerReason({ oauthConnected: true, accountId: 'urn:li:organization:12345' })).toBeNull();
  });

  // LinkedIn Lead Gen Forms uses Microsoft OAuth — verify the logic is provider-agnostic
  it('works for Microsoft-OAuth LinkedIn lead gen account', () => {
    const account = { oauthConnected: true, accountId: 'urn:li:organization:99999' };
    expect(leadSyncBlockerReason(account)).toBeNull();
  });

  it('blocks LinkedIn lead gen when Microsoft token missing', () => {
    const account = { oauthConnected: false, accountId: 'urn:li:organization:99999' };
    expect(leadSyncBlockerReason(account)).toBe('no_oauth');
  });
});

// ── marketplaceListingBlockerReason ───────────────────────────────────────────

describe('marketplaceListingBlockerReason', () => {
  it('returns null when account is null (no oauthProvider to check)', () => {
    // null account with no oauthProvider context — falls through to needs_setup
    expect(marketplaceListingBlockerReason(null)).toBe('needs_setup');
  });

  it('returns needs_oauth for an OAuth platform not yet connected', () => {
    expect(marketplaceListingBlockerReason({
      oauthProvider: 'ebay',
      oauthConnected: false,
      state: 'ACCOUNT_NEEDED',
    })).toBe('needs_oauth');
  });

  it('returns needs_oauth even when state is ACTIVE if OAuth token missing', () => {
    expect(marketplaceListingBlockerReason({
      oauthProvider: 'ebay',
      oauthConnected: false,
      state: 'ACTIVE',
    })).toBe('needs_oauth');
  });

  it('returns needs_setup for ACCOUNT_NEEDED on a non-OAuth platform', () => {
    expect(marketplaceListingBlockerReason({
      oauthProvider: null,
      oauthConnected: false,
      state: 'ACCOUNT_NEEDED',
    })).toBe('needs_setup');
  });

  it('returns needs_setup for CREDENTIALS_NEEDED', () => {
    expect(marketplaceListingBlockerReason({
      oauthProvider: null,
      oauthConnected: false,
      state: 'CREDENTIALS_NEEDED',
    })).toBe('needs_setup');
  });

  it('returns null for an active non-OAuth marketplace platform', () => {
    expect(marketplaceListingBlockerReason({
      oauthProvider: null,
      oauthConnected: false,
      state: 'ACTIVE',
    })).toBeNull();
  });

  it('returns null for an active OAuth-connected marketplace platform', () => {
    expect(marketplaceListingBlockerReason({
      oauthProvider: 'ebay',
      oauthConnected: true,
      state: 'ACTIVE',
    })).toBeNull();
  });

  it('returns null when state is PENDING_REVIEW (not a setup blocker)', () => {
    expect(marketplaceListingBlockerReason({
      oauthProvider: null,
      oauthConnected: false,
      state: 'PENDING_REVIEW',
    })).toBeNull();
  });
});

// ── socialRowSubtitle ─────────────────────────────────────────────────────────

describe('socialRowSubtitle', () => {
  it('returns null for a non-social platform', () => {
    expect(socialRowSubtitle(false, true, 'My Page')).toBeNull();
  });

  it('returns null for a social platform that is not connected', () => {
    expect(socialRowSubtitle(true, false, undefined)).toBeNull();
  });

  it('returns null for a social platform that is not connected even with a page name', () => {
    expect(socialRowSubtitle(true, false, 'My Page')).toBeNull();
  });

  it('returns "No page selected" prompt when social is connected but no page chosen', () => {
    const result = socialRowSubtitle(true, true, undefined);
    expect(result).toBe('No page selected — open details to choose one');
  });

  it('returns "Page selected: <name>" when social is connected and page is set', () => {
    expect(socialRowSubtitle(true, true, 'Test Motors Facebook')).toBe('Page selected: Test Motors Facebook');
  });

  it('uses the exact page name from the API response', () => {
    expect(socialRowSubtitle(true, true, 'Green Valley Toyota')).toBe('Page selected: Green Valley Toyota');
  });
});

// ── hasLiveValidationNote ─────────────────────────────────────────────────────

describe('hasLiveValidationNote', () => {
  it('returns false for null account', () => {
    expect(hasLiveValidationNote(null)).toBe(false);
  });

  it('returns false for undefined account', () => {
    expect(hasLiveValidationNote(undefined)).toBe(false);
  });

  it('returns false when liveValidationNote is null', () => {
    expect(hasLiveValidationNote({ liveValidationNote: null })).toBe(false);
  });

  it('returns false when liveValidationNote is empty string', () => {
    expect(hasLiveValidationNote({ liveValidationNote: '' })).toBe(false);
  });

  it('returns true when liveValidationNote has content', () => {
    expect(hasLiveValidationNote({
      liveValidationNote: 'Live validation blocked — requires MICROSOFT_CLIENT_ID.',
    })).toBe(true);
  });

  // Verify the logic matches actual platform profiles that set this field
  it('returns true for LinkedIn Lead Gen Forms validation note', () => {
    const note = 'Live validation blocked — requires MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and approved LinkedIn Marketing API access with r_organization_leadgen_forms scope.';
    expect(hasLiveValidationNote({ liveValidationNote: note })).toBe(true);
  });
});
