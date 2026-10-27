import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveSaleAttribution } from '../services/attribution/saleAttribution.js';
import { SaleDetailsError, validateSaleDetails } from '../services/attribution/saleRecordService.js';

const soldAt = new Date('2026-10-20T15:00:00Z');
const before = new Date('2026-10-10T12:00:00Z');
const after = new Date('2026-10-21T12:00:00Z');

function lead(id: string, platformSlug: string, workflowStatus: string, createdAt = before) {
  return { id, platformSlug, workflowStatus, createdAt };
}

describe('sale attribution rules', () => {
  it('leaves a sale with no evidence unattributed', () => {
    assert.deepEqual(resolveSaleAttribution({ soldAt, confirmedChannelSlug: null, leads: [] }),
      { attributed: false, reason: 'NO_EVIDENCE', evidenceLeadIds: [] });
  });

  it('does not treat inquiries received before the sale as evidence', () => {
    const result = resolveSaleAttribution({
      soldAt, confirmedChannelSlug: null,
      leads: [lead('l1', 'consumer-marketplace', 'NEW'), lead('l2', 'dealer-storefront', 'APPOINTMENT')],
    });
    assert.equal(result.attributed, false);
  });

  it('attributes to the dealer-confirmed channel', () => {
    const result = resolveSaleAttribution({ soldAt, confirmedChannelSlug: 'cargurus-dealer', leads: [] });
    assert.deepEqual(result, {
      attributed: true, channelSlug: 'cargurus-dealer', method: 'DEALER_CONFIRMED',
      sourceConfidence: 'MANUAL_IMPORTED', evidenceLeadIds: [],
    });
  });

  it('prefers the dealer confirmation over a lead marked sold on another channel', () => {
    const result = resolveSaleAttribution({
      soldAt, confirmedChannelSlug: 'cargurus-dealer', leads: [lead('l1', 'consumer-marketplace', 'SOLD')],
    });
    assert.equal(result.attributed && result.channelSlug, 'cargurus-dealer');
  });

  it('attributes to the one channel whose lead the dealership marked sold', () => {
    const result = resolveSaleAttribution({
      soldAt, confirmedChannelSlug: null,
      leads: [lead('l1', 'consumer-marketplace', 'SOLD'), lead('l2', 'consumer-marketplace', 'SOLD'), lead('l3', 'dealer-storefront', 'NEW')],
    });
    assert.deepEqual(result, {
      attributed: true, channelSlug: 'consumer-marketplace', method: 'LEAD_MARKED_SOLD',
      sourceConfidence: 'MANUAL_IMPORTED', evidenceLeadIds: ['l1', 'l2'],
    });
  });

  it('leaves the sale unattributed when leads on different channels were marked sold', () => {
    const result = resolveSaleAttribution({
      soldAt, confirmedChannelSlug: null,
      leads: [lead('l1', 'consumer-marketplace', 'SOLD'), lead('l2', 'dealer-storefront', 'SOLD')],
    });
    assert.deepEqual(result, { attributed: false, reason: 'CONFLICTING_SOLD_LEADS', evidenceLeadIds: ['l1', 'l2'] });
  });

  it('ignores a lead that arrived after the vehicle was marked sold', () => {
    const result = resolveSaleAttribution({ soldAt, confirmedChannelSlug: null, leads: [lead('l1', 'consumer-marketplace', 'SOLD', after)] });
    assert.equal(result.attributed, false);
  });
});

describe('sale details validation — no invented values', () => {
  const now = new Date('2026-10-27T12:00:00Z');

  it('returns only the fields supplied, so nothing is filled in', () => {
    assert.deepEqual(validateSaleDetails({}, now), {});
    assert.deepEqual(validateSaleDetails({ salePriceCents: 2_300_000 }, now), { salePriceCents: 2_300_000 });
  });

  it('accepts null and blank as "unknown"', () => {
    assert.deepEqual(validateSaleDetails({ transactionDate: '', salePriceCents: null, confirmedChannelSlug: '' }, now),
      { transactionDate: null, salePriceCents: null, confirmedChannelSlug: null });
  });

  for (const [label, body] of [
    ['a future transaction date', { transactionDate: '2026-11-01' }],
    ['a malformed date', { transactionDate: '10/20/2026' }],
    ['a zero price', { salePriceCents: 0 }],
    ['a fractional price', { salePriceCents: 10.5 }],
    ['an unknown channel', { confirmedChannelSlug: 'walk-in' }],
    ['a non-object body', 'sold'],
  ] as const) {
    it(`rejects ${label}`, () => assert.throws(() => validateSaleDetails(body, now), SaleDetailsError));
  }
});
