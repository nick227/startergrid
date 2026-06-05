// ── Types ─────────────────────────────────────────────────────────────────────

export type PollingSourceMeta = {
  id:                  string;
  label:               string;
  status:              string;
  pollIntervalMinutes: number | null;
  lastCheckedAt:       string | null;
};

export type PollSummary = {
  total:    number;
  active:   number;
  due:      number;
  notDue:   number;
  skipped:  number;
  errors:   number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const DEFAULT_POLL_INTERVAL_MINUTES = 60;
export const MIN_POLL_INTERVAL_MINUTES     = 5;
export const MAX_POLL_INTERVAL_MINUTES     = 10_080; // 1 week

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Returns true when the source has a poll interval configured and enough time
 * has elapsed since lastCheckedAt (or it has never been checked).
 */
export function isSourceDueForCheck(
  source: PollingSourceMeta,
  now: Date = new Date(),
): boolean {
  if (source.pollIntervalMinutes === null) return false;
  if (!source.lastCheckedAt) return true;
  const elapsedMs = now.getTime() - new Date(source.lastCheckedAt).getTime();
  return elapsedMs >= source.pollIntervalMinutes * 60_000;
}

/**
 * Returns the ISO timestamp of the next scheduled check, or null if no
 * poll interval is configured. May be in the past (overdue).
 */
export function getNextCheckAt(
  source: PollingSourceMeta,
  now: Date = new Date(),
): string | null {
  if (source.pollIntervalMinutes === null) return null;
  if (!source.lastCheckedAt) return now.toISOString();
  return new Date(
    new Date(source.lastCheckedAt).getTime() + source.pollIntervalMinutes * 60_000,
  ).toISOString();
}

/**
 * Counts sources by polling state. ERROR sources are counted separately —
 * the poll loop decides whether to retry them based on caller flags.
 */
export function summarizeSourcePolling(
  sources: PollingSourceMeta[],
  now: Date = new Date(),
): PollSummary {
  let active = 0, due = 0, notDue = 0, skipped = 0, errors = 0;

  for (const s of sources) {
    switch (s.status) {
      case 'PAUSED':
      case 'DISCONNECTED':
        skipped++;
        break;
      case 'ERROR':
        errors++;
        break;
      case 'ACTIVE':
        active++;
        if (isSourceDueForCheck(s, now)) due++;
        else notDue++;
        break;
    }
  }

  return { total: sources.length, active, due, notDue, skipped, errors };
}
