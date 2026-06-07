import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { jobStartedLine, jobStarted } from '../lib/jobLog.js';

const FIXED = new Date('2026-06-06T12:00:00.000Z');

describe('jobStartedLine', () => {
  it('returns correct format for a fixed timestamp', () => {
    assert.equal(
      jobStartedLine('SyncScheduler', FIXED),
      'SyncScheduler started 2026-06-06T12:00:00.000Z'
    );
  });

  it('includes the job name exactly', () => {
    const line = jobStartedLine('IngressPoll', FIXED);
    assert.ok(line.startsWith('IngressPoll '), `expected "IngressPoll " prefix, got: ${line}`);
  });

  it('includes the ISO 8601 timestamp', () => {
    const line = jobStartedLine('PerformanceCompute', FIXED);
    assert.ok(
      line.includes('2026-06-06T12:00:00.000Z'),
      `expected ISO timestamp in: ${line}`
    );
  });

  it('uses current time when no timestamp is supplied', () => {
    const before = Date.now();
    const line = jobStartedLine('AnyJob');
    const after = Date.now();

    const match = line.match(/started (.+)$/);
    assert.ok(match, 'line must contain "started <timestamp>"');
    const ts = Date.parse(match![1]);
    assert.ok(!isNaN(ts), `timestamp must be parseable: ${match![1]}`);
    assert.ok(ts >= before && ts <= after, 'timestamp must be within this test\'s window');
  });

  it('produces a single line with no embedded newlines', () => {
    const line = jobStartedLine('SyncScheduler', FIXED);
    assert.ok(!line.includes('\n'), 'start line must not contain newlines');
  });

  it('all three job names produce the correct prefix', () => {
    const names = ['SyncScheduler', 'IngressPoll', 'PerformanceCompute'];
    for (const name of names) {
      const line = jobStartedLine(name, FIXED);
      assert.ok(
        line.startsWith(`${name} started `),
        `"${name}" line must start with "${name} started "`
      );
    }
  });
});

describe('jobStarted', () => {
  it('writes exactly the jobStartedLine to console.log', () => {
    const logged: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logged.push(args.map(String).join(' '));
    try {
      jobStarted('SyncScheduler', FIXED);
    } finally {
      console.log = orig;
    }
    assert.equal(logged.length, 1);
    assert.equal(logged[0], 'SyncScheduler started 2026-06-06T12:00:00.000Z');
  });

  it('does not throw for any valid job name', () => {
    const orig = console.log;
    console.log = () => {};
    try {
      assert.doesNotThrow(() => jobStarted('SyncScheduler'));
      assert.doesNotThrow(() => jobStarted('IngressPoll'));
      assert.doesNotThrow(() => jobStarted('PerformanceCompute'));
    } finally {
      console.log = orig;
    }
  });
});
