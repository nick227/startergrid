import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ChannelCostError,
  getCurrentYearMonth,
  isValidMonth,
  monthRange,
  reportedCost,
  validateChannelCost,
} from '../services/channel/channelCostService.js';

describe('channel cost — unknown is not zero', () => {
  it('reports no cost when neither component was reported', () => {
    assert.equal(reportedCost(null, null), null);
  });

  it('keeps a reported zero as zero', () => {
    assert.equal(reportedCost(0, null), 0);
    assert.equal(reportedCost(null, 0), 0);
  });

  it('sums only the reported components', () => {
    assert.equal(reportedCost(125_000, null), 125_000);
    assert.equal(reportedCost(125_000, 40_000), 165_000);
  });

  it('treats blank amounts as not reported rather than zero', () => {
    const input = validateChannelCost({ platformSlug: 'cargurus-dealer', month: '2026-10', flatFeeCents: '', adSpendCents: undefined });
    assert.equal(input.flatFeeCents, null);
    assert.equal(input.adSpendCents, null);
  });
});

describe('channel cost — validation', () => {
  const valid = { platformSlug: 'cargurus-dealer', month: '2026-10', flatFeeCents: 125_000, adSpendCents: 0 };

  it('accepts a known channel, month and non-negative integer cents', () => {
    assert.deepEqual(validateChannelCost(valid), { ...valid, notes: null });
  });

  for (const [label, body] of [
    ['unknown channel', { ...valid, platformSlug: 'not-a-channel' }],
    ['missing month', { ...valid, month: undefined }],
    ['malformed month', { ...valid, month: '2026-13' }],
    ['negative amount', { ...valid, adSpendCents: -1 }],
    ['fractional cents', { ...valid, flatFeeCents: 10.5 }],
    ['string amount', { ...valid, flatFeeCents: '1200' }],
  ] as const) {
    it(`rejects ${label}`, () => assert.throws(() => validateChannelCost(body), ChannelCostError));
  }
});

describe('channel cost — months', () => {
  it('formats the current UTC month', () => {
    assert.equal(getCurrentYearMonth(new Date(Date.UTC(2026, 4, 15))), '2026-05');
  });

  it('validates YYYY-MM', () => {
    assert.equal(isValidMonth('2026-10'), true);
    assert.equal(isValidMonth('2026-00'), false);
    assert.equal(isValidMonth('2026-1'), false);
    assert.equal(isValidMonth(undefined), false);
  });

  it('spans a calendar month in UTC, crossing the year boundary', () => {
    const { start, end } = monthRange('2026-12');
    assert.equal(start.toISOString(), '2026-12-01T00:00:00.000Z');
    assert.equal(end.toISOString(), '2027-01-01T00:00:00.000Z');
  });
});
