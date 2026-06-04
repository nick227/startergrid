import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  scheduleAutoReconcile,
  getAutoSyncStatus,
  _resetAutoReconcileState,
} from '../services/publishing/autoReconcileService.js';

describe('scheduleAutoReconcile', () => {
  beforeEach(() => _resetAutoReconcileState());

  it('marks dealer as scheduled', () => {
    scheduleAutoReconcile('dealer-1', { full: true });
    const st = getAutoSyncStatus('dealer-1');
    assert.equal(st.phase, 'scheduled');
    assert.equal(st.scheduledFullReconcile, true);
  });

  it('coalesces full flag when batch and dispatch-only writes overlap', () => {
    scheduleAutoReconcile('dealer-1', { full: false });
    scheduleAutoReconcile('dealer-1', { full: true });
    const st = getAutoSyncStatus('dealer-1');
    assert.equal(st.scheduledFullReconcile, true);
  });
});
