import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  readSourceSnapshotMode,
  resolveSourceCheckIngestOpts,
} from '../services/inventory/sourceSnapshotCheck.js';

describe('readSourceSnapshotMode', () => {
  it('returns true only when config flag is true', () => {
    assert.equal(readSourceSnapshotMode({ snapshotMode: true }), true);
    assert.equal(readSourceSnapshotMode({ snapshotMode: false }), false);
    assert.equal(readSourceSnapshotMode(null), false);
  });
});

describe('resolveSourceCheckIngestOpts', () => {
  it('returns empty opts when snapshot is off', () => {
    assert.deepEqual(resolveSourceCheckIngestOpts(null, {}), {});
    assert.deepEqual(resolveSourceCheckIngestOpts({ snapshotMode: false }, {}), {});
  });

  it('uses source config for scheduled poll with dry-run only', () => {
    assert.deepEqual(
      resolveSourceCheckIngestOpts({ snapshotMode: true }, { trigger: 'scheduled' }),
      { snapshotMode: true, dryRun: true },
    );
  });

  it('uses source config for manual check with dry-run only', () => {
    assert.deepEqual(
      resolveSourceCheckIngestOpts({ snapshotMode: true }, { trigger: 'manual' }),
      { snapshotMode: true, dryRun: true },
    );
  });

  it('allows one-off snapshot dry-run via check body override', () => {
    assert.deepEqual(
      resolveSourceCheckIngestOpts(null, { snapshotMode: true, trigger: 'manual' }),
      { snapshotMode: true, dryRun: true },
    );
  });

  it('does not apply snapshot when source off and body omits flag', () => {
    assert.deepEqual(
      resolveSourceCheckIngestOpts({ snapshotMode: false }, { trigger: 'manual' }),
      {},
    );
  });
});
