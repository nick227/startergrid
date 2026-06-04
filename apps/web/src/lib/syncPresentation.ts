import type {
  AutoSyncStatus,
  NextRecommendedAction,
  PlatformPublishResult,
  PublishStatusResponse,
  SyncEvent,
} from './types.ts';

export type SyncPlatformOutcome = 'live' | 'ready' | 'waiting' | 'blocked';

export type SyncPlatformOutcomeMeta = {
  outcome: SyncPlatformOutcome;
  label: string;
  pill: string;
  sort: number;
};

const OUTCOME_META: Record<SyncPlatformOutcome, Omit<SyncPlatformOutcomeMeta, 'outcome'>> = {
  live: { label: 'Live', pill: 'bg-emerald-100 text-emerald-800 border-emerald-200', sort: 3 },
  ready: { label: 'Will sync', pill: 'bg-sky-100 text-sky-800 border-sky-200', sort: 2 },
  waiting: { label: 'Needs you', pill: 'bg-amber-100 text-amber-900 border-amber-200', sort: 1 },
  blocked: { label: 'Blocked', pill: 'bg-red-100 text-red-800 border-red-200', sort: 0 },
};

export function platformSyncOutcome(state: string): SyncPlatformOutcome {
  if (state === 'Active') return 'live';
  if (state === 'Ready' || state === 'Scheduled') return 'ready';
  if (state === 'Needs Approval') return 'waiting';
  return 'blocked';
}

export function platformOutcomeMeta(p: PlatformPublishResult): SyncPlatformOutcomeMeta {
  const outcome = platformSyncOutcome(p.state);
  return { outcome, ...OUTCOME_META[outcome] };
}

export function friendlyPlatformDetail(p: PlatformPublishResult): string | null {
  if (p.accountState === 'BLOCKED' || p.accountState === 'SUSPENDED') {
    return 'Account not in good standing';
  }
  if (p.accountState === 'ACCOUNT_NEEDED' || p.accountState === 'CREDENTIALS_NEEDED') {
    return 'Finish account setup';
  }
  if (p.accountState === 'PARTNER_REQUIRED' || p.state === 'Partner Required') {
    return 'Partner agreement needed';
  }
  if (p.state === 'Needs Approval') return 'Waiting for your confirmation';
  if (p.state === 'Failed') return 'Last sync attempt failed';
  if (p.state === 'Blocked') return 'Cannot sync until resolved';
  if (p.readiness === 'RED') return 'Listing not ready for this platform';
  if (p.readiness === 'YELLOW') return 'Minor listing issue';
  return null;
}

export type SyncReadiness = {
  canSyncNow: boolean;
  carsReady: number;
  carsBlocked: number;
  carsWarning: number;
  carsTotal: number;
  platformsLive: number;
  platformsWillSync: number;
  platformsNeedYou: number;
  platformsBlocked: number;
  platformTotal: number;
  headline: string;
  subline: string;
  autoSyncLine: string;
  autoSyncPhase: AutoSyncStatus['phase'];
  blocker: SyncBlocker | null;
};

export type SyncBlocker = {
  title: string;
  detail: string;
  fixLabel: string;
  fixTarget: 'inventory' | 'accounts' | 'sync';
};

const BLOCKER_BY_ACTION: Record<
  Exclude<NextRecommendedAction, 'no_action' | 'run_scheduler'>,
  Omit<SyncBlocker, 'detail'> & { detail: (n: number) => string }
> = {
  fix_blocked_vehicles: {
    title: 'Fix inventory first',
    detail: n => `${n} vehicle${n !== 1 ? 's' : ''} cannot sync until data issues are cleared.`,
    fixLabel: 'Open inventory',
    fixTarget: 'inventory',
  },
  resolve_account_requirement: {
    title: 'Platform accounts need attention',
    detail: n => `${n} platform${n !== 1 ? 's' : ''} cannot receive inventory until accounts are fixed.`,
    fixLabel: 'Open accounts',
    fixTarget: 'accounts',
  },
  resolve_partner_requirement: {
    title: 'Partner agreements needed',
    detail: n => `${n} platform${n !== 1 ? 's' : ''} need a commercial agreement before sync.`,
    fixLabel: 'Open accounts',
    fixTarget: 'accounts',
  },
  review_approvals: {
    title: 'Some platforms need your OK',
    detail: n => `${n} platform${n !== 1 ? 's' : ''} are held for approval — everything else updates automatically.`,
    fixLabel: 'View platforms',
    fixTarget: 'accounts',
  },
};

function autoSyncHeadline(phase: AutoSyncStatus['phase']): string | null {
  if (phase === 'running') return 'Updating platforms…';
  if (phase === 'scheduled') return 'Changes saved — updating soon';
  if (phase === 'failed') return 'Auto-update hit a snag';
  return null;
}

export function computeSyncReadiness(data: PublishStatusResponse): SyncReadiness {
  const auto = data.autoSync;
  const autoPhase = auto?.phase ?? 'idle';
  const v = data.vehicles;
  const outcomes = data.platforms.map(platformOutcomeMeta);
  const platformsLive = outcomes.filter(o => o.outcome === 'live').length;
  const platformsWillSync = outcomes.filter(o => o.outcome === 'ready').length;
  const platformsNeedYou = outcomes.filter(o => o.outcome === 'waiting').length;
  const platformsBlocked = outcomes.filter(o => o.outcome === 'blocked').length;
  const platformTotal = data.platforms.length;

  const canSyncNow =
    v.blocked === 0 &&
    (data.nextRecommendedAction === 'no_action' || data.nextRecommendedAction === 'run_scheduler');

  let blocker: SyncBlocker | null = null;
  if (!canSyncNow && data.nextRecommendedAction !== 'no_action' && data.nextRecommendedAction !== 'run_scheduler') {
    const meta = BLOCKER_BY_ACTION[data.nextRecommendedAction];
    const n =
      data.nextRecommendedAction === 'fix_blocked_vehicles'
        ? v.blocked
        : data.nextRecommendedAction === 'review_approvals'
          ? data.summary['Needs Approval']
          : data.nextRecommendedAction === 'resolve_partner_requirement'
            ? data.summary['Partner Required']
            : data.summary.Blocked;
    blocker = {
      title: meta.title,
      detail: meta.detail(n),
      fixLabel: meta.fixLabel,
      fixTarget: meta.fixTarget,
    };
  }

  const autoHeadline = autoSyncHeadline(autoPhase);
  const headline = autoHeadline
    ?? (canSyncNow
      ? 'Auto-sync is on'
      : v.blocked > 0
        ? 'Fix inventory to resume updates'
        : 'Needs attention before full auto-sync');

  const willMove = v.ready;
  const targetPlatforms = platformsWillSync + platformsLive;

  const subline = autoPhase === 'failed' && auto?.lastError
    ? auto.lastError
    : autoPhase === 'running' || autoPhase === 'scheduled'
      ? `Pushing ${willMove} ready vehicle${willMove !== 1 ? 's' : ''} toward ${targetPlatforms || platformTotal} platform${(targetPlatforms || platformTotal) !== 1 ? 's' : ''} — no action needed.`
      : canSyncNow
        ? `${willMove} vehicle${willMove !== 1 ? 's' : ''} stay aligned across ${targetPlatforms || platformTotal} platform${(targetPlatforms || platformTotal) !== 1 ? 's' : ''}. Save in Inventory and we handle the rest.`
        : blocker?.detail ?? 'Fix the blocker below; other platforms keep updating when they can.';

  const autoSyncLine =
    autoPhase === 'idle' && auto?.lastCompletedAt
      ? `Last auto-update ${relativeTime(auto.lastCompletedAt)}${auto.lastDispatched != null && auto.lastDispatched > 0 ? ` · ${auto.lastDispatched} dispatch${auto.lastDispatched !== 1 ? 'es' : ''}` : ''}`
      : autoPhase === 'idle'
        ? 'Inventory changes auto-sync to platforms after you save.'
        : '';

  return {
    canSyncNow,
    carsReady: v.ready,
    carsBlocked: v.blocked,
    carsWarning: v.warning,
    carsTotal: v.total,
    platformsLive,
    platformsWillSync,
    platformsNeedYou,
    platformsBlocked,
    platformTotal,
    headline,
    subline,
    autoSyncLine,
    autoSyncPhase: autoPhase,
    blocker: autoPhase === 'running' || autoPhase === 'scheduled' ? null : blocker,
  };
}

export function sortPlatformsForSync(platforms: PlatformPublishResult[]): PlatformPublishResult[] {
  return [...platforms].sort((a, b) => {
    const oa = platformOutcomeMeta(a).sort;
    const ob = platformOutcomeMeta(b).sort;
    if (oa !== ob) return oa - ob;
    return a.platformName.localeCompare(b.platformName);
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function lastSyncSummary(events: SyncEvent[]): { when: string; what: string } | null {
  if (!events.length) return null;

  const sent = events.find(e => e.kind === 'SUBMISSION_SENT');
  if (sent) {
    return {
      when: relativeTime(sent.createdAt),
      what: 'Inventory was sent to a marketplace',
    };
  }

  const batch = events.filter(e => e.kind === 'ARTIFACT_GENERATED');
  if (batch.length) {
    const platforms = new Set(batch.map(e => e.platformSlug).filter(Boolean));
    return {
      when: relativeTime(batch[0]!.createdAt),
      what: `Inventory reached ${platforms.size} platform${platforms.size !== 1 ? 's' : ''}`,
    };
  }

  const latest = events[0]!;
  return {
    when: relativeTime(latest.createdAt),
    what: 'Activity recorded',
  };
}
