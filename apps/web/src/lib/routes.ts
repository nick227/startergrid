import type { OperatorNavHandlers, OperatorPageSegment } from './operatorNav.ts';

export type OperatorRoute = {
  dealerId: string | null;
  page: OperatorPageSegment | null;
  platformSlug: string | null;
  platformView: 'queue' | 'history' | null;
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

export function parseOperatorRoute(): OperatorRoute {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === '/help' || hash === 'help' || hash === '/knowledge' || hash === 'knowledge') {
    return { dealerId: null, page: 'help', platformSlug: null, platformView: null };
  }

  const match = window.location.hash.match(/^#\/([^/]+)(?:\/(.+))?/);
  if (!match) return { dealerId: null, page: null, platformSlug: null, platformView: null };

  const dealerId = match[1] ?? null;
  const rest = match[2] ?? '';

  const platformMatch = rest.match(/^platforms\/([^/]+)(?:\/(queue|history))?$/);
  if (platformMatch) {
    return {
      dealerId,
      page: 'platforms',
      platformSlug: platformMatch[1] ?? null,
      platformView: (platformMatch[2] as 'queue' | 'history') ?? null,
    };
  }

  const page = parsePageSegment(rest || undefined);
  return { dealerId, page, platformSlug: null, platformView: null };
}

export function knowledgeHash(dealerId?: string | null): string {
  return dealerId ? `#/${dealerId}/help` : '#/help';
}

export function dealerPickerHash(): string {
  return '';
}

export function operatorHash(dealerId: string, page?: OperatorPageSegment | null): string {
  const resolved = page ?? 'platforms';
  if (resolved === 'platforms') return `#/${dealerId}/platforms`;
  return `#/${dealerId}/${resolved}`;
}

export function platformQueueHash(dealerId: string, platformSlug: string): string {
  return `#/${dealerId}/platforms/${platformSlug}/queue`;
}

export function platformHistoryHash(dealerId: string, platformSlug: string): string {
  return `#/${dealerId}/platforms/${platformSlug}/history`;
}

export function buildOperatorNav(dealerId: string): OperatorNavHandlers {
  return {
    goToPlatforms: () => { window.location.hash = operatorHash(dealerId, 'platforms'); },
    goToQueue: () => { window.location.hash = operatorHash(dealerId, 'queue'); },
    goToHistory: () => { window.location.hash = operatorHash(dealerId, 'history'); },
    goToReports: () => { window.location.hash = operatorHash(dealerId, 'reports'); },
    goToInventory: () => { window.location.hash = operatorHash(dealerId, 'inventory'); },
    goToHelp: () => { window.location.hash = operatorHash(dealerId, 'help'); },
    goToPlatformQueue: slug => { window.location.hash = platformQueueHash(dealerId, slug); },
    goToPlatformHistory: slug => { window.location.hash = platformHistoryHash(dealerId, slug); },
    goToSync: () => { window.location.hash = operatorHash(dealerId, 'platforms'); },
    goToAccounts: () => { window.location.hash = operatorHash(dealerId, 'platforms'); },
    goToInsights: () => { window.location.hash = operatorHash(dealerId, 'reports'); },
    goToKnowledge: () => { window.location.hash = operatorHash(dealerId, 'help'); },
    changeDealer: () => { window.location.hash = dealerPickerHash(); },
  };
}

/** Redirect legacy hash paths (#/dealer/sync, accounts, insights) to new IA. */
export function normalizeOperatorHash(): void {
  const raw = window.location.hash.replace(/^#/, '');
  if (raw === '/knowledge' || raw === 'knowledge') {
    window.location.replace('#/help');
    return;
  }
  const m = raw.match(/^\/([^/]+)\/(accounts|insights|sync)(?:\/.*)?$/);
  if (!m) return;
  const [, dealerId, legacy] = m;
  const next = legacy === 'insights' ? 'reports' : 'platforms';
  window.location.replace(`#/${dealerId}/${next}`);
}
