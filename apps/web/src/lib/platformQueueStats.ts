import type { PlatformQueueStats } from '@/lib/types.ts';

export function platformStatsBySlug(
  byPlatform: PlatformQueueStats[] | undefined,
): Map<string, PlatformQueueStats> {
  const m = new Map<string, PlatformQueueStats>();
  for (const row of byPlatform ?? []) m.set(row.platformSlug, row);
  return m;
}

export function platformQueueSummaryLine(stats: PlatformQueueStats | null | undefined): string | null {
  if (!stats) return null;
  const parts: string[] = [];
  parts.push(postingModeShort(stats.postingMode));
  if (stats.nextScheduledFor) {
    parts.push(`next batch ${formatShortDate(stats.nextScheduledFor)}`);
  }
  const waiting = stats.scheduled + stats.queued + stats.needsApproval + stats.blocked + stats.held;
  if (waiting > 0) {
    parts.push(`${waiting} in queue`);
  }
  if (stats.needsApproval > 0) parts.push(`${stats.needsApproval} need approval`);
  if (stats.blocked > 0) parts.push(`${stats.blocked} blocked`);
  return parts.join(' · ');
}

function postingModeShort(mode: string): string {
  switch (mode) {
    case 'REAL_TIME': return 'Real-time';
    case 'SCHEDULED': return 'Scheduled batch';
    case 'MANUAL': return 'Manual';
    case 'APPROVAL_REQUIRED': return 'Approval required';
    default: return mode.replace(/_/g, ' ').toLowerCase();
  }
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
