import type { PlatformAccountDetail } from './types.ts';

// ── LeadSync panel ────────────────────────────────────────────────────────────

export type LeadSyncBlocker = 'no_oauth' | 'no_account_id';

/**
 * Returns the reason a leadSync panel cannot show its full UI, or null when the
 * platform is ready to fetch leads.  Checks in dependency order: OAuth token
 * before account ID, since no token makes the API call impossible.
 */
export function leadSyncBlockerReason(
  account: Pick<PlatformAccountDetail, 'oauthConnected' | 'accountId'> | null,
): LeadSyncBlocker | null {
  if (!account?.oauthConnected) return 'no_oauth';
  if (!account.accountId) return 'no_account_id';
  return null;
}

// ── MarketplaceListing panel ──────────────────────────────────────────────────

export type MarketplaceListingBlocker = 'needs_oauth' | 'needs_setup';

/**
 * Returns the reason a marketplaceListing panel cannot show listing controls,
 * or null when the account is ready.  Checks OAuth first (platform-specific),
 * then account state (universal).
 */
export function marketplaceListingBlockerReason(
  account: Pick<PlatformAccountDetail, 'oauthProvider' | 'oauthConnected' | 'state'> | null,
): MarketplaceListingBlocker | null {
  if (account?.oauthProvider && !account.oauthConnected) return 'needs_oauth';
  if (!account || account.state === 'ACCOUNT_NEEDED' || account.state === 'CREDENTIALS_NEEDED') return 'needs_setup';
  return null;
}

// ── Social posting row ────────────────────────────────────────────────────────

/**
 * Returns the subtitle string for a socialPosting platform row, or null when
 * no subtitle applies (non-social platform or not yet connected).
 */
export function socialRowSubtitle(
  isSocial: boolean,
  isConnected: boolean,
  pageName: string | undefined,
): string | null {
  if (!isSocial || !isConnected) return null;
  return pageName
    ? `Page selected: ${pageName}`
    : 'No page selected — open details to choose one';
}

// ── liveValidationNote ────────────────────────────────────────────────────────

/**
 * Returns true when an account carries a liveValidationNote that should be
 * rendered as an amber banner in the Setup tab.
 */
export function hasLiveValidationNote(
  account: Pick<PlatformAccountDetail, 'liveValidationNote'> | null | undefined,
): boolean {
  return Boolean(account?.liveValidationNote);
}
