import type { PlatformPublishResult } from './types.ts';
import { friendlyPlatformDetail, platformOutcomeMeta, sortPlatformsForSync } from './syncPresentation.ts';

export type PlatformConnection = 'inactive' | 'connected' | 'blocked' | 'updating';

export type PlatformConnectionMeta = {
  connection: PlatformConnection;
  label: string;
  sort: number;
  pill: string;
};

const CONNECTION_PILL: Record<PlatformConnection, string> = {
  blocked: 'bg-status-error-bg text-status-error-text border-status-error-border',
  inactive: 'bg-silver-100 text-ink-muted border-silver-200',
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
    return { connection: 'blocked', label: 'Blocked', sort: 0, pill: CONNECTION_PILL.blocked };
  }
  if (acct === 'ACCOUNT_NEEDED' || acct === 'CREDENTIALS_NEEDED') {
    return { connection: 'inactive', label: 'Setup needed', sort: 1, pill: CONNECTION_PILL.inactive };
  }
  if (p.state === 'Scheduled' || p.state === 'Ready' || p.state === 'Needs Approval') {
    return { connection: 'updating', label: 'Updating', sort: 2, pill: CONNECTION_PILL.updating };
  }
  if (p.state === 'Active') {
    return { connection: 'connected', label: 'Connected', sort: 3, pill: CONNECTION_PILL.connected };
  }
  return { connection: 'inactive', label: 'Inactive', sort: 1, pill: CONNECTION_PILL.inactive };
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
  if (!total) return 'No listing sites configured yet.';

  let connected = 0;
  let setup = 0;
  let blocked = 0;
  let updating = 0;

  for (const p of platforms) {
    const c = platformConnection(p).connection;
    if (c === 'connected') connected++;
    else if (c === 'inactive') setup++;
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
  { key: 'connected', label: 'Connected' },
  { key: 'inactive', label: 'Setup needed' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'updating', label: 'Updating' },
];
