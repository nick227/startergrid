import type { JsonIngestOpts } from './importService.js';

export type SourceCheckTrigger = 'manual' | 'scheduled';

export type SourceCheckOptions = {
  /** Override source config for this check only */
  snapshotMode?: boolean;
  trigger?: SourceCheckTrigger;
};

export function readSourceSnapshotMode(
  config: Record<string, unknown> | null,
): boolean {
  return config?.snapshotMode === true;
}

/** Snapshot checks always dry-run — removals require explicit SnapshotReviewCard commit. */
export function resolveSourceCheckIngestOpts(
  config: Record<string, unknown> | null,
  opts: SourceCheckOptions = {},
): Pick<JsonIngestOpts, 'snapshotMode' | 'dryRun'> {
  const snapshotMode = opts.snapshotMode ?? readSourceSnapshotMode(config);
  if (!snapshotMode) return {};

  return { snapshotMode: true, dryRun: true };
}
