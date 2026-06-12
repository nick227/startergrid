import type { OperatorNavHandlers, OperatorPageSegment } from './operatorNav.ts';
import { appendRowNavScope, parseRowNavScope, splitOperatorHash, type RowNavScope } from './rowNavScope.ts';
import { parseReportRoute } from './reportRoutes.ts';

export type { RowNavScope };

export type OperatorRoute = {
  dealerId: string | null;
  page: OperatorPageSegment | null;
  platformSlug: string | null;
  platformView: 'queue' | 'history' | null;
  assetRef: string | null;
  assetId: string | null;
  reportFamily: 'inventory' | 'platform' | null;
  reportSlug: string | null;
  reportRange: import('./reportsCatalog.ts').ReportRangePreset;
  /** Set when page==='admin' and the URL is #/admin/dealers/{id}. Null for all other routes. */
  adminDealerId: string | null;
  /** Dealer sub-page within admin (platforms/queue/history/reports/inventory/help). Null otherwise. */
  adminDealerPage: string | null;
  /** Set when the URL is #/admin/platforms/{slug}. Null for all other routes. */
  adminPlatformSlug: string | null;
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
    segment === 'leads' ||
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
    reportFamily: null,
    reportSlug: null,
    reportRange: 'now',
    adminDealerId: null,
    adminDealerPage: null,
    adminPlatformSlug: null,
  };
}

function routeWithReports(
  base: Omit<OperatorRoute, 'reportFamily' | 'reportSlug' | 'reportRange' | 'adminPlatformSlug'> & { adminPlatformSlug?: string | null },
  hash: string,
): OperatorRoute {
  const adminPlatformSlug = base.adminPlatformSlug ?? null;
  if (base.page !== 'reports') {
    return { ...base, adminPlatformSlug, reportFamily: null, reportSlug: null, reportRange: 'now' };
  }
  const report = parseReportRoute(hash);
  return {
    ...base,
    adminPlatformSlug,
    reportFamily: report.family,
    reportSlug: report.slug,
    reportRange: report.range,
  };
}

export function parseOperatorRoute(hash = window.location.hash): OperatorRoute {
  const { path, query } = splitOperatorHash(hash);
  const scope = parseRowNavScope(query);
  const assetRef = scope.assetRef ?? null;
  const assetId = scope.assetId ?? null;

  // Site administration (SUPER_ADMIN only) — standalone, no dealer context.
  if (path.startsWith('/admin') || path.startsWith('admin')) {
    const cleanPath = path.replace(/^\//, ''); // remove leading slash
    const parts = cleanPath.split('/');
    // #/admin/dealers/{dealerId}[/{page}[/{platformSlug}[/queue|history]]]
    if (parts[1] === 'dealers' && parts[2]) {
      const adminDealerId = parts[2];
      const adminDealerPage = parts[3] ?? null;
      // Platform detail sub-route: /admin/dealers/{id}/platforms/{slug}[/queue|history]
      if (adminDealerPage === 'platforms' && parts[4]) {
        const platformSlug = parts[4];
        const platformView = (parts[5] === 'queue' || parts[5] === 'history') ? parts[5] as 'queue' | 'history' : null;
        return routeWithReports(
          { dealerId: null, page: 'admin', platformSlug, platformView, assetRef, assetId, adminDealerId, adminDealerPage },
          hash,
        );
      }
      // Reports sub-route: parse report family/slug from path segments
      if (adminDealerPage === 'reports') {
        const { query } = splitOperatorHash(hash);
        const reportFamily = (parts[4] === 'inventory' || parts[4] === 'platform') ? parts[4] as 'inventory' | 'platform' : null;
        const reportSlug = parts[5] ?? null;
        const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
        const rawRange = params.get('range');
        const reportRange: import('./reportsCatalog.ts').ReportRangePreset =
          (rawRange === '7d' || rawRange === '30d' || rawRange === '90d' || rawRange === 'now') ? rawRange : 'now';
        return { dealerId: null, page: 'admin', platformSlug: null, platformView: null, assetRef, assetId, adminDealerId, adminDealerPage, reportFamily, reportSlug, reportRange, adminPlatformSlug: null };
      }
      return routeWithReports(
        { dealerId: null, page: 'admin', platformSlug: null, platformView: null, assetRef, assetId, adminDealerId, adminDealerPage },
        hash,
      );
    }
    // #/admin/platforms/:slug — per-platform admin detail
    if (parts[1] === 'platforms' && parts[2]) {
      return routeWithReports(
        { dealerId: null, page: 'admin', platformSlug: 'platforms', platformView: null, assetRef, assetId, adminDealerId: null, adminDealerPage: null, adminPlatformSlug: parts[2] },
        hash,
      );
    }
    const platformSlug = parts[1] || null;
    return routeWithReports(
      { dealerId: null, page: 'admin', platformSlug, platformView: null, assetRef, assetId, adminDealerId: null, adminDealerPage: null },
      hash,
    );
  }

  if (path === '/help' || path === 'help' || path === '/knowledge' || path === 'knowledge') {
    return routeWithReports(
      { dealerId: null, page: 'help', platformSlug: null, platformView: null, assetRef, assetId, adminDealerId: null, adminDealerPage: null },
      hash,
    );
  }

  if (path === '/signup' || path === 'signup') {
    return routeWithReports(
      { dealerId: null, page: 'signup', platformSlug: null, platformView: null, assetRef, assetId, adminDealerId: null, adminDealerPage: null },
      hash,
    );
  }

  const match = path.match(/^\/([^/]+)(?:\/(.+))?$/);
  if (!match) return emptyRoute();

  const dealerId = match[1] ?? null;
  const rest = match[2] ?? '';

  const platformMatch = rest.match(/^platforms\/([^/]+)(?:\/(queue|history))?$/);
  if (platformMatch) {
    return routeWithReports(
      {
        dealerId,
        page: 'platforms',
        platformSlug: platformMatch[1] ?? null,
        platformView: (platformMatch[2] as 'queue' | 'history') ?? null,
        assetRef,
        assetId,
        adminDealerId: null,
        adminDealerPage: null,
      },
      hash,
    );
  }

  if (rest.startsWith('reports')) {
    return routeWithReports(
      { dealerId, page: 'reports', platformSlug: null, platformView: null, assetRef, assetId, adminDealerId: null, adminDealerPage: null },
      hash,
    );
  }

  const page = parsePageSegment(rest || undefined);
  return routeWithReports(
    { dealerId, page, platformSlug: null, platformView: null, assetRef, assetId, adminDealerId: null, adminDealerPage: null },
    hash,
  );
}

export function adminDealerHash(dealerId: string): string {
  return `#/admin/dealers/${dealerId}`;
}

export function adminPlatformHash(slug: string): string {
  return `#/admin/platforms/${slug}`;
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

export function platformDetailHash(dealerId: string, platformSlug: string, scope?: RowNavScope): string {
  return appendRowNavScope(`#/${dealerId}/platforms/${platformSlug}`, scope);
}

export function platformQueueHash(dealerId: string, platformSlug: string, scope?: RowNavScope): string {
  return appendRowNavScope(`#/${dealerId}/platforms/${platformSlug}/queue`, scope);
}

export function platformHistoryHash(dealerId: string, platformSlug: string, scope?: RowNavScope): string {
  return appendRowNavScope(`#/${dealerId}/platforms/${platformSlug}/history`, scope);
}

export function buildOperatorNav(dealerId: string): OperatorNavHandlers {
  return {
    goToHome: () => { window.location.hash = `#/${dealerId}`; },
    goToPlatforms: () => { window.location.hash = operatorHash(dealerId, 'platforms'); },
    goToQueue: scope => { window.location.hash = operatorHash(dealerId, 'queue', scope); },
    goToHistory: scope => { window.location.hash = operatorHash(dealerId, 'history', scope); },
    goToReports: () => { window.location.hash = operatorHash(dealerId, 'reports'); },
    goToInventory: scope => { window.location.hash = operatorHash(dealerId, 'inventory', scope); },
    goToLeads: () => { window.location.hash = operatorHash(dealerId, 'leads'); },
    goToHelp: () => { window.location.hash = operatorHash(dealerId, 'help'); },
    goToPlatformDetail: (slug, scope) => { window.location.hash = platformDetailHash(dealerId, slug, scope); },
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
