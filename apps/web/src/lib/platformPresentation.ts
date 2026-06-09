import type { PlatformPublishResult, PlatformAccountDetail } from './types.ts';
import { friendlyPlatformDetail, platformOutcomeMeta, sortPlatformsForSync } from './syncPresentation.ts';
import { operatorCopy } from './copy/operator.ts';

export type PlatformConnection = 'inactive' | 'connected' | 'blocked' | 'updating' | 'needs_oauth' | 'partner_pending';

const OAUTH_PROVIDER_NAMES: Record<string, string> = {
  meta: 'Meta',
  google: 'Google',
  microsoft: 'Microsoft',
  ebay: 'eBay',
  tiktok: 'TikTok',
  apple: 'Apple',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  snapchat: 'Snapchat',
  x: 'X',
  nextdoor: 'Nextdoor',
  shopify: 'Shopify',
};

export function oauthProviderDisplayName(provider: string): string {
  return OAUTH_PROVIDER_NAMES[provider] ?? (provider.charAt(0).toUpperCase() + provider.slice(1));
}

export type PlatformConnectionMeta = {
  connection: PlatformConnection;
  label: string;
  sort: number;
  pill: string;
};

const CONNECTION_PILL: Record<PlatformConnection, string> = {
  blocked: 'bg-status-error-bg text-status-error-text border-status-error-border',
  inactive: 'bg-silver-100 text-ink-muted border-silver-200',
  needs_oauth: 'bg-amber-50 text-amber-700 border-amber-200',
  partner_pending: 'bg-blue-50 text-blue-700 border-blue-200',
  updating: 'bg-status-info-bg text-status-info-text border-status-info-border',
  connected: 'bg-status-success-bg text-status-success-text border-status-success-border',
};

export function platformConnection(p: PlatformPublishResult): PlatformConnectionMeta {
  const acct = p.accountState;
  if (
    acct === 'BLOCKED' ||
    acct === 'SUSPENDED' ||
    acct === 'PARTNER_REQUIRED' ||
    p.state === 'Blocked' ||
    p.state === 'Failed'
  ) {
    return { connection: 'blocked', label: operatorCopy.connection.blocked, sort: 0, pill: CONNECTION_PILL.blocked };
  }
  if (acct === 'ACCOUNT_NEEDED' || acct === 'CREDENTIALS_NEEDED') {
    return { connection: 'inactive', label: operatorCopy.connection.setupNeeded, sort: 1, pill: CONNECTION_PILL.inactive };
  }
  if (p.state === 'Scheduled' || p.state === 'Ready' || p.state === 'Needs Approval') {
    return { connection: 'updating', label: operatorCopy.connection.updating, sort: 2, pill: CONNECTION_PILL.updating };
  }
  if (p.state === 'Active') {
    return { connection: 'connected', label: operatorCopy.connection.connected, sort: 3, pill: CONNECTION_PILL.connected };
  }
  return { connection: 'inactive', label: operatorCopy.connection.inactive, sort: 1, pill: CONNECTION_PILL.inactive };
}

export function platformConnectionWithAccount(
  p: PlatformPublishResult,
  account: PlatformAccountDetail | null | undefined
): PlatformConnectionMeta {
  const base = platformConnection(p);
  if (base.connection === 'inactive') {
    if (account?.oauthProvider && !account.oauthConnected) {
      const displayName = oauthProviderDisplayName(account.oauthProvider);
      const label = account.oauthExpired
        ? `Re-connect ${displayName}`
        : `Connect ${displayName}`;
      return { connection: 'needs_oauth', label, sort: 0, pill: CONNECTION_PILL.needs_oauth };
    }
    if (account?.state === 'PENDING_REVIEW' && account.partnerSignup) {
      const label = `Applied · ${account.partnerSignup.estimatedDays}`;
      return { connection: 'partner_pending', label, sort: 1, pill: CONNECTION_PILL.partner_pending };
    }
  }
  return base;
}

export type PlatformConnectionFilter = 'ALL' | PlatformConnection;

export function platformMatchesFilter(p: PlatformPublishResult, filter: PlatformConnectionFilter): boolean {
  if (filter === 'ALL') return true;
  return platformConnection(p).connection === filter;
}

export function platformMetaLine(p: PlatformPublishResult): string {
  const detail = friendlyPlatformDetail(p);
  const outcome = platformOutcomeMeta(p).label;
  if (detail) return detail;
  return outcome;
}

export function platformSituationSummary(platforms: PlatformPublishResult[]): string {
  const total = platforms.length;
  if (!total) return operatorCopy.platforms.noneConfigured;

  let connected = 0;
  let setup = 0;
  let blocked = 0;
  let updating = 0;

  for (const p of platforms) {
    const c = platformConnection(p).connection;
    if (c === 'connected') connected++;
    else if (c === 'inactive' || c === 'needs_oauth' || c === 'partner_pending') setup++;
    else if (c === 'blocked') blocked++;
    else if (c === 'updating') updating++;
  }

  const parts: string[] = [`${connected} of ${total} connected`];
  if (setup) parts.push(`${setup} need setup`);
  if (blocked) parts.push(`${blocked} blocked`);
  if (updating) parts.push(`${updating} updating`);
  return parts.join(' · ');
}

export function sortPlatformsForDisplay(
  platforms: PlatformPublishResult[],
  sort: 'urgency' | 'name'
): PlatformPublishResult[] {
  if (sort === 'name') {
    return [...platforms].sort((a, b) => a.platformName.localeCompare(b.platformName));
  }
  return sortPlatformsForSync(platforms);
}

export const PLATFORM_CONNECTION_FILTERS: Array<{ key: PlatformConnectionFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'connected', label: operatorCopy.connection.connected },
  { key: 'inactive', label: operatorCopy.connection.setupNeeded },
  { key: 'blocked', label: operatorCopy.connection.blocked },
  { key: 'updating', label: operatorCopy.connection.updating },
];
