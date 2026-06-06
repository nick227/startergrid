import type { IngressSnapshotReview } from './types.ts';

export const JSON_INGEST_MAX_BYTES = 5 * 1024 * 1024;

export type JsonIngestPayload = {
  sourceSlug?: string;
  sourceLabel?: string;
  vehicles: unknown[];
};

export function jsonIngestFileTooLarge(bytes: number): boolean {
  return bytes > JSON_INGEST_MAX_BYTES;
}

export function formatJsonIngestFileSizeError(bytes: number): string {
  const maxMb = (JSON_INGEST_MAX_BYTES / (1024 * 1024)).toFixed(0);
  const gotMb = (bytes / (1024 * 1024)).toFixed(1);
  return `File is ${gotMb} MB — maximum ${maxMb} MB for portal ingest. Split the feed or use the API.`;
}

export function parseJsonIngestText(
  text: string,
): { ok: true; data: JsonIngestPayload } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Paste a JSON payload or upload a file.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Invalid JSON — check brackets, quotes, and trailing commas.' };
  }

  if (Array.isArray(parsed)) {
    return { ok: false, error: 'Payload must be a JSON object with a vehicles array, not a bare array.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Payload must be a JSON object with a vehicles array.' };
  }

  const body = parsed as Record<string, unknown>;
  if (!Array.isArray(body.vehicles)) {
    return { ok: false, error: 'Missing vehicles array — add "vehicles": [ ... ] to the payload.' };
  }

  if (body.vehicles.length === 0) {
    return { ok: false, error: 'vehicles array is empty — add at least one vehicle row.' };
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

type SnapshotCandidateInput = {
  stockNumber: string;
  vehicleId: string;
  reason: 'missing_from_feed';
  label?: string;
};

export function snapshotReviewFromSalesStatus(
  salesStatus: {
    snapshotRemovedCandidates: SnapshotCandidateInput[];
    snapshotRemovalsApplied: number;
    snapshotDryRun: boolean;
  },
): IngressSnapshotReview | null {
  const seen = new Set<string>();
  const candidates = salesStatus.snapshotRemovedCandidates
    .filter(c => typeof c.stockNumber === 'string' && c.stockNumber.trim().length > 0)
    .filter(c => {
      const key = c.stockNumber.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(c => ({
      ...c,
      stockNumber: c.stockNumber.trim(),
      label: c.label ?? 'Missing from latest feed',
    }));

  if (candidates.length === 0) return null;

  const pendingCount = salesStatus.snapshotDryRun
    ? candidates.length
    : Math.max(0, candidates.length - salesStatus.snapshotRemovalsApplied);

  if (pendingCount === 0) return null;

  return {
    snapshotMode: true,
    snapshotDryRun: salesStatus.snapshotDryRun,
    snapshotRemovalsApplied: salesStatus.snapshotRemovalsApplied,
    pendingCount,
    candidates,
  };
}
