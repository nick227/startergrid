import type { AdminDashboardResponse } from '@/lib/api/admin.ts';

type QueueSnapshot = AdminDashboardResponse['queueSnapshot'];

export function formatPendingAge(sec: number | null): string {
  if (sec === null) return 'none';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export type QueueHealthGuidance = {
  hint: string;
  summary: string | null;
  actions: string[];
};

export function queueHealthGuidance(
  queueState: string | undefined,
  snapshot: QueueSnapshot | undefined,
): QueueHealthGuidance {
  const pending = snapshot?.pending ?? 0;
  const failed = snapshot?.failed ?? 0;
  const held = snapshot?.held ?? 0;
  const oldestAge = snapshot?.oldestPendingAgeSec ?? null;
  const oldestLabel = formatPendingAge(oldestAge);
  const lastSync = snapshot?.lastSuccessSyncAt
    ? new Date(snapshot.lastSuccessSyncAt).toLocaleString()
    : null;

  if (queueState === 'unhealthy') {
    return {
      hint: 'Queue offline — database unreachable',
      summary: 'Publish queue workers cannot read or update items until the database connection is restored.',
      actions: [
        'Restore database connectivity and confirm the API health check passes.',
        'Restart the API process after the database is healthy.',
        'Re-run the sync scheduler once services are back up.',
      ],
    };
  }

  if (queueState === 'backed_up') {
    return {
      hint: `Scheduler stalled — oldest pending item is ${oldestLabel} old`,
      summary: 'At least one publish job has sat in READY, SCHEDULED, or CLAIMED for more than 1 hour without completing. The pipeline is not draining normally.',
      actions: [
        'Confirm the sync scheduler cron/PM2 job is running (expected every 5 minutes).',
        'Manually run the scheduler to drain backlog: `npm run sync:scheduler` (or your deployed equivalent).',
        failed > 0
          ? `Review ${failed} failed queue item${failed === 1 ? '' : 's'} — fix credentials or payload errors, then retry.`
          : 'Scan the operator Publish Queue for failed sends and credential errors.',
        held > 0
          ? `Release or reject ${held} held / approval-required item${held === 1 ? '' : 's'} blocking dealers.`
          : 'Check for held or approval-required items blocking dispatch.',
        lastSync
          ? `Last successful sync run was ${lastSync} — if that is stale, the scheduler may not be firing.`
          : 'No completed sync run on record — scheduler may never have run in this environment.',
      ],
    };
  }

  if (queueState === 'flowing') {
    return {
      hint: pending > 0
        ? `${pending} item${pending === 1 ? '' : 's'} in pipeline — processing on schedule`
        : 'No backlog — scheduler is current',
      summary: oldestAge !== null && oldestAge > 0
        ? `Oldest pending work is ${oldestLabel} old (under the 1 hour stall threshold).`
        : null,
      actions: [],
    };
  }

  return {
    hint: 'Sync and publish pipeline',
    summary: null,
    actions: [],
  };
}
