import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseReportRangePreset,
  reportRangeWhere,
  toReportTimeWindowDto,
} from '../services/reports/reportRange.js';

const NOW = new Date('2026-06-06T12:00:00.000Z');

describe('parseReportRangePreset', () => {
  it('defaults to 7d', () => {
    const w = parseReportRangePreset(undefined, NOW);
    assert.equal(w.preset, '7d');
    assert.equal(w.to.toISOString(), NOW.toISOString());
    assert.equal(w.from.toISOString(), '2026-05-30T12:00:00.000Z');
  });

  it('accepts 30d and 90d', () => {
    const w30 = parseReportRangePreset('30d', NOW);
    assert.equal(w30.preset, '30d');
    assert.equal(w30.from.toISOString(), '2026-05-07T12:00:00.000Z');

    const w90 = parseReportRangePreset('90d', NOW);
    assert.equal(w90.preset, '90d');
    assert.equal(w90.from.toISOString(), '2026-03-08T12:00:00.000Z');
  });

  it('falls back to 7d for invalid values', () => {
    assert.equal(parseReportRangePreset('now', NOW).preset, '7d');
    assert.equal(parseReportRangePreset('custom', NOW).preset, '7d');
  });
});

describe('toReportTimeWindowDto', () => {
  it('serializes ISO bounds', () => {
    const w = parseReportRangePreset('7d', NOW);
    const dto = toReportTimeWindowDto(w);
    assert.equal(dto.preset, '7d');
    assert.equal(dto.from, w.from.toISOString());
    assert.equal(dto.to, w.to.toISOString());
  });
});

describe('reportRangeWhere', () => {
  it('returns gte/lt bounds', () => {
    const w = parseReportRangePreset('7d', NOW);
    const where = reportRangeWhere(w);
    assert.equal(where.gte.toISOString(), w.from.toISOString());
    assert.equal(where.lt.toISOString(), w.to.toISOString());
  });
});
