import type { IngressSnapshotReview } from './types.ts';

export type JsonIngestPayload = {
  sourceSlug?: string;
  sourceLabel?: string;
  vehicles: unknown[];
};

export function parseJsonIngestText(
  text: string,
): { ok: true; data: JsonIngestPayload } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Paste a JSON payload or upload a file.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Invalid JSON — check brackets and quotes.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Payload must be a JSON object with a vehicles array.' };
  }

  const body = parsed as Record<string, unknown>;
  if (!Array.isArray(body.vehicles) || body.vehicles.length === 0) {
    return { ok: false, error: 'vehicles must be a non-empty array.' };
  }

  return {
    ok: true,
    data: {
      sourceSlug: typeof body.sourceSlug === 'string' ? body.sourceSlug : undefined,
      sourceLabel: typeof body.sourceLabel === 'string' ? body.sourceLabel : undefined,
      vehicles: body.vehicles,
    },
  };
}

export function snapshotReviewFromSalesStatus(
  salesStatus: {
    snapshotRemovedCandidates: Array<{
      stockNumber: string;
      vehicleId: string;
      reason: 'missing_from_feed';
      label?: string;
    }>;
    snapshotRemovalsApplied: number;
    snapshotDryRun: boolean;
  },
): IngressSnapshotReview | null {
  const candidates = salesStatus.snapshotRemovedCandidates.map(c => ({
    ...c,
    label: c.label ?? 'Missing from latest feed',
  }));
  if (candidates.length === 0) return null;

  return {
    snapshotMode: true,
    snapshotDryRun: salesStatus.snapshotDryRun,
    snapshotRemovalsApplied: salesStatus.snapshotRemovalsApplied,
    pendingCount: salesStatus.snapshotDryRun
      ? candidates.length
      : Math.max(0, candidates.length - salesStatus.snapshotRemovalsApplied),
    candidates,
  };
}
