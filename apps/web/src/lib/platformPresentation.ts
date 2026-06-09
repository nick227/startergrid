import type { PlatformPublishResult, PlatformAccountDetail, PlatformPerformanceItem } from './types.ts';
import { friendlyPlatformDetail, platformOutcomeMeta, sortPlatformsForSync } from './syncPresentation.ts';
import { operatorCopy } from './copy/operator.ts';
import { timeAgo } from './timeAgo.ts';

export type PlatformConnection = 'inactive' | 'connected' | 'blocked' | 'updating' | 'needs_oauth' | 'partner_pending';

// ── Static benefit copy ──────────────────────────────────────────────────────

const PLATFORM_BENEFIT_LINES: Record<string, string> = {
  'google-vehicle-ads':          'In-market buyers searching on Google & Shopping',
  'meta-automotive-ads':         'Retarget browsing shoppers across Meta & Instagram',
  'facebook-marketplace-general':'Reach local resale buyers on Facebook Marketplace',
  'youtube-creator':             'Video walk-arounds and inventory showcases',
  'tiktok-automotive-ads':       'Video inventory ads for younger, mobile-first buyers',
  'microsoft-automotive-ads':    'Bing & Edge in-market buyers at lower CPCs',
  'linkedin-lead-gen-forms':     'Business buyers and fleet decision-makers',
  'pinterest-shopping-ads':      'Discovery-stage shoppers planning their next vehicle',
  'reddit-dynamic-product-ads':  'Enthusiast communities and active researchers',
  'snapchat-dynamic-product-ads':'High mobile-engagement younger demographic',
  'x-dynamic-product-ads':       'Current-event-driven buyers and brand awareness',
  'nextdoor-ads':                'Hyper-local neighborhood buyers near your lot',
  'ebay-motors':                 '50M+ active buyers on the leading resale marketplace',
  'ebay-resale':                 'Reach collectors and resale buyers on eBay',
  'cargurus-dealer':             'High-intent shoppers on the #1 automotive marketplace',
  'autotrader-cox':              'Largest dealer marketplace — 30M monthly visitors',
  'cars-com':                    'Shoppers comparing vehicles with real verified reviews',
  'truecar-dealer-network':      'Price-certain buyers ready to transact today',
  'dealer-storefront':           'Your own branded inventory website',
  'consumer-marketplace':        'First-party discovery across your full inventory',
  'apple-business-connect':      'Apple Maps location presence and local discovery',
  'adf-xml-lead-routing':        'Route every platform lead directly into your CRM',
};

export function platformBenefitLine(slug: string): string | null {
  return PLATFORM_BENEFIT_LINES[slug] ?? null;
}

// ── Effort badge ─────────────────────────────────────────────────────────────

export type EffortBadge = { label: string; pill: string };

export function effortBadge(
  account: PlatformAccountDetail | null | undefined
): EffortBadge | null {
  if (!account) return null;
  if (account.integrationClass === 'OWNED') return null;
  if (account.state === 'ACTIVE') return null;
  if (account.oauthExpired) {
    return { label: 'token expired', pill: 'bg-red-50 text-red-700 border-red-200' };
  }
  if (account.oauthProvider && !account.oauthConnected) {
    return { label: '~5 min', pill: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (account.state === 'PENDING_REVIEW') {
    if (account.partnerSignup) {
      return { label: `partner · awaiting`, pill: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    return { label: 'pending review', pill: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (account.partnerSignup && (account.state === 'ACCOUNT_NEEDED' || account.state === 'PARTNER_REQUIRED')) {
    return { label: `partner · ${account.partnerSignup.estimatedDays}`, pill: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (account.state === 'CREDENTIALS_NEEDED') {
    return { label: 'needs credentials', pill: 'bg-silver-100 text-ink-muted border-silver-200' };
  }
  return null;
}

// ── Feed health line ─────────────────────────────────────────────────────────

export function feedHealthLine(
  perf: PlatformPerformanceItem | null | undefined,
  connection: PlatformConnection
): string | null {
  if (connection !== 'connected') return null;
  if (!perf) return null;
  const parts: string[] = [];
  if (perf.vehiclesListed > 0) parts.push(`${perf.vehiclesListed} listings`);
  if (perf.totalLeads > 0) parts.push(`${perf.totalLeads} leads`);
  if (perf.computedAt) parts.push(timeAgo(perf.computedAt));
  if (!parts.length) return null;
  return parts.join(' · ');
}

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
