export const DEFAULT_NEW_ARRIVAL_DAYS = 14;

export function isNewArrival(
  listedAt: string | null | undefined,
  windowDays = DEFAULT_NEW_ARRIVAL_DAYS,
  nowMs = Date.now(),
): boolean {
  if (!listedAt) return false;
  const listedMs = Date.parse(listedAt);
  if (Number.isNaN(listedMs)) return false;
  const cutoffMs = nowMs - windowDays * 24 * 60 * 60 * 1000;
  return listedMs >= cutoffMs;
}

export const NEW_ARRIVAL_LABEL = 'New arrival';

/** FILTER-10 — no confidence source; never show on cards. */
export function shouldShowGreatValueBadge(): boolean {
  return false;
}

/** FILTER-10 — finance model not wired; hide payment estimate badges. */
export function shouldShowPaymentEstimateBadge(): boolean {
  return false;
}
