import type { OperatorNavHandlers, OperatorPageSegment } from './operatorNav.ts';
import { appendRowNavScope, parseRowNavScope, splitOperatorHash, type RowNavScope } from './rowNavScope.ts';

export type { RowNavScope };

export type OperatorRoute = {
  dealerId: string | null;
  page: OperatorPageSegment | null;
  platformSlug: string | null;
  platformView: 'queue' | 'history' | null;
  assetRef: string | null;
  assetId: string | null;
};

const LEGACY_SEGMENT_MAP: Record<string, OperatorPageSegment> = {
  accounts: 'platforms',
  insights: 'reports',
  sync: 'platforms',
};

function parsePageSegment(segment: string | undefined): OperatorPageSegment | null {
  if (!segment) return 'platforms';
  if (segment === 'knowledge') return 'help';
  const legacy = LEGACY_SEGMENT_MAP[segment];
  if (legacy) return legacy;
  if (
    segment === 'platforms' ||
    segment === 'queue' ||
    segment === 'history' ||
    segment === 'reports' ||
    segment === 'inventory' ||
    segment === 'help'
  ) {
    return segment;
  }
  return 'platforms';
}

function emptyRoute(): OperatorRoute {
  return {
    dealerId: null,
    page: null,
    platformSlug: null,
    platformView: null,
    assetRef: null,
    assetId: null,
  };
}

export function parseOperatorRoute(hash = window.location.hash): OperatorRoute {
  const { path, query } = splitOperatorHash(hash);
  const scope = parseRowNavScope(query);
  const assetRef = scope.assetRef ?? null;
  const assetId = scope.assetId ?? null;

  if (path === '/help' || path === 'help' || path === '/knowledge' || path === 'knowledge') {
    return { dealerId: null, page: 'help', platformSlug: null, platformView: null, assetRef, assetId };
  }

  const match = path.match(/^\/([^/]+)(?:\/(.+))?$/);
  if (!match) return emptyRoute();

  const dealerId = match[1] ?? null;
  const rest = match[2] ?? '';

  const platformMatch = rest.match(/^platforms\/([^/]+)(?:\/(queue|history))?$/);
  if (platformMatch) {
    return {
      dealerId,
      page: 'platforms',
      platformSlug: platformMatch[1] ?? null,
      platformView: (platformMatch[2] as 'queue' | 'history') ?? null,
      assetRef,
      assetId,
    };
  }

  const page = parsePageSegment(rest || undefined);
  return { dealerId, page, platformSlug: null, platformView: null, assetRef, assetId };
}

export function knowledgeHash(dealerId?: string | null): string {
  return dealerId ? `#/${dealerId}/help` : '#/help';
}

export function dealerPickerHash(): string {
  return '';
}

export function operatorHash(
  dealerId: string,
  page?: OperatorPageSegment | null,
  scope?: RowNavScope
): string {
  const resolved = page ?? 'platforms';
  const base = resolved === 'platforms' ? `#/${dealerId}/platforms` : `#/${dealerId}/${resolved}`;
  return appendRowNavScope(base, scope);
}

export function platformQueueHash(dealerId: string, platformSlug: string, scope?: RowNavScope): string {
  return appendRowNavScope(`#/${dealerId}/platforms/${platformSlug}/queue`, scope);
}

export function platformHistoryHash(dealerId: string, platformSlug: string, scope?: RowNavScope): string {
  return appendRowNavScope(`#/${dealerId}/platforms/${platformSlug}/history`, scope);
}

export function buildOperatorNav(dealerId: string): OperatorNavHandlers {
  return {
    goToPlatforms: () => { window.location.hash = operatorHash(dealerId, 'platforms'); },
    goToQueue: scope => { window.location.hash = operatorHash(dealerId, 'queue', scope); },
    goToHistory: scope => { window.location.hash = operatorHash(dealerId, 'history', scope); },
    goToReports: () => { window.location.hash = operatorHash(dealerId, 'reports'); },
    goToInventory: scope => { window.location.hash = operatorHash(dealerId, 'inventory', scope); },
    goToHelp: () => { window.location.hash = operatorHash(dealerId, 'help'); },
    goToPlatformQueue: (slug, scope) => { window.location.hash = platformQueueHash(dealerId, slug, scope); },
    goToPlatformHistory: (slug, scope) => { window.location.hash = platformHistoryHash(dealerId, slug, scope); },
    goToSync: () => { window.location.hash = operatorHash(dealerId, 'platforms'); },
    goToAccounts: () => { window.location.hash = operatorHash(dealerId, 'platforms'); },
    goToInsights: () => { window.location.hash = operatorHash(dealerId, 'reports'); },
    goToKnowledge: () => { window.location.hash = operatorHash(dealerId, 'help'); },
    changeDealer: () => { window.location.hash = dealerPickerHash(); },
  };
}

/** Redirect legacy hash paths (#/dealer/sync, accounts, insights) to new IA. */
export function normalizeOperatorHash(): void {
  const { path } = splitOperatorHash(window.location.hash);
  if (path === '/knowledge' || path === 'knowledge') {
    window.location.replace('#/help');
    return;
  }
  const m = path.match(/^\/([^/]+)\/(accounts|insights|sync)(?:\/.*)?$/);
  if (!m) return;
  const [, dealerId, legacy] = m;
  const next = legacy === 'insights' ? 'reports' : 'platforms';
  window.location.replace(`#/${dealerId}/${next}`);
}
