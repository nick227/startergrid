import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeSetupInvoice,
  computeMonthlyInvoice,
  formatCents,
  periodToDateRange,
  type SubscriptionRef,
  type SetupInvoiceStats,
  type MonthlyInvoiceStats
} from '../services/invoiceService.js';

const DEALER_ID = 'test-dealer-001';
const DEALER_NAME = 'Prairie Ridge Motors LLC';

const defaultSubscription: SubscriptionRef = {
  plan: 'MONTHLY_MANAGED',
  setupFeeCents: 100000,
  monthlyFeeCents: 39900
};

const defaultSetupStats: SetupInvoiceStats = {
  readinessRunCount: 2,
  artifactCount: 40,
  activePlatformCount: 1,
  latestProofPath: 'exports/proof-test-dealer-001.zip'
};

const defaultMonthlyStats: MonthlyInvoiceStats = {
  activePlatformCount: 16,
  leadCount: 3,
  vehicleUpdateCount: 5,
  latestProofPath: 'exports/proof-test-dealer-001.zip'
};

describe('computeSetupInvoice', () => {
  it('total equals setupFeeCents', () => {
    const inv = computeSetupInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultSetupStats, '2026-06');
    assert.equal(inv.totalCents, 100000);
  });

  it('type is SETUP', () => {
    const inv = computeSetupInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultSetupStats, '2026-06');
    assert.equal(inv.type, 'SETUP');
  });

  it('includes setup fee line item with correct amount', () => {
    const inv = computeSetupInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultSetupStats, '2026-06');
    const feeLine = inv.lineItems.find(l => l.totalCents > 0);
    assert.ok(feeLine, 'expected a line item with totalCents > 0');
    assert.equal(feeLine!.totalCents, 100000);
  });

  it('includes readiness run count in line items', () => {
    const inv = computeSetupInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultSetupStats, '2026-06');
    const hasRuns = inv.lineItems.some(l => l.description.includes('2 runs'));
    assert.ok(hasRuns, 'expected readiness run count in line items');
  });

  it('includes artifact count in line items', () => {
    const inv = computeSetupInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultSetupStats, '2026-06');
    const hasArtifacts = inv.lineItems.some(l => l.description.includes('40 artifacts'));
    assert.ok(hasArtifacts);
  });

  it('includes proof path when present', () => {
    const inv = computeSetupInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultSetupStats, '2026-06');
    const hasProof = inv.lineItems.some(l => l.description.includes('proof-test-dealer-001'));
    assert.ok(hasProof);
  });

  it('omits proof line item when latestProofPath is null', () => {
    const stats = { ...defaultSetupStats, latestProofPath: null };
    const inv = computeSetupInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, stats, '2026-06');
    const hasProof = inv.lineItems.some(l => l.description.toLowerCase().includes('proof folder'));
    assert.ok(!hasProof);
  });

  it('carries dealershipId and dealerLegalName', () => {
    const inv = computeSetupInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultSetupStats, '2026-06');
    assert.equal(inv.dealershipId, DEALER_ID);
    assert.equal(inv.dealerLegalName, DEALER_NAME);
  });

  it('singular/plural — 1 run 1 artifact', () => {
    const stats = { ...defaultSetupStats, readinessRunCount: 1, artifactCount: 1 };
    const inv = computeSetupInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, stats, '2026-06');
    const line = inv.lineItems.find(l => l.description.includes('run'));
    assert.ok(line?.description.includes('1 run,'), `got: ${line?.description}`);
    assert.ok(line?.description.includes('1 artifact'), `got: ${line?.description}`);
  });
});

describe('computeMonthlyInvoice', () => {
  it('total equals monthlyFeeCents', () => {
    const inv = computeMonthlyInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultMonthlyStats, '2026-06');
    assert.equal(inv.totalCents, 39900);
  });

  it('type is MONTHLY', () => {
    const inv = computeMonthlyInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultMonthlyStats, '2026-06');
    assert.equal(inv.type, 'MONTHLY');
  });

  it('monthly fee line item has correct amount', () => {
    const inv = computeMonthlyInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultMonthlyStats, '2026-06');
    const feeLine = inv.lineItems.find(l => l.totalCents > 0);
    assert.ok(feeLine);
    assert.equal(feeLine!.totalCents, 39900);
  });

  it('includes active platform count', () => {
    const inv = computeMonthlyInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultMonthlyStats, '2026-06');
    assert.ok(inv.lineItems.some(l => l.description.includes('16')));
  });

  it('includes lead count', () => {
    const inv = computeMonthlyInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultMonthlyStats, '2026-06');
    assert.ok(inv.lineItems.some(l => l.description.includes('3') && l.description.toLowerCase().includes('lead')));
  });

  it('includes vehicle update count', () => {
    const inv = computeMonthlyInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultMonthlyStats, '2026-06');
    assert.ok(inv.lineItems.some(l => l.description.includes('5') && l.description.toLowerCase().includes('update')));
  });

  it('includes proof reference when present', () => {
    const inv = computeMonthlyInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultMonthlyStats, '2026-06');
    assert.ok(inv.lineItems.some(l => l.description.includes('proof-test-dealer-001')));
  });

  it('carries period', () => {
    const inv = computeMonthlyInvoice(DEALER_ID, DEALER_NAME, defaultSubscription, defaultMonthlyStats, '2026-06');
    assert.equal(inv.period, '2026-06');
  });
});

describe('formatCents', () => {
  it('formats 100000 as $1000.00', () => {
    assert.equal(formatCents(100000), '$1000.00');
  });
  it('formats 39900 as $399.00', () => {
    assert.equal(formatCents(39900), '$399.00');
  });
  it('formats 0 as $0.00', () => {
    assert.equal(formatCents(0), '$0.00');
  });
  it('formats 150 as $1.50', () => {
    assert.equal(formatCents(150), '$1.50');
  });
});

describe('periodToDateRange', () => {
  it('parses 2026-06 correctly', () => {
    const { start, end } = periodToDateRange('2026-06');
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 5); // 0-indexed
    assert.equal(start.getDate(), 1);
    assert.equal(end.getFullYear(), 2026);
    assert.equal(end.getMonth(), 6); // July start
    assert.equal(end.getDate(), 1);
  });

  it('end is exclusive — first day of next month', () => {
    const { end } = periodToDateRange('2026-12');
    assert.equal(end.getFullYear(), 2027);
    assert.equal(end.getMonth(), 0); // January
  });

  it('start is less than end', () => {
    const { start, end } = periodToDateRange('2026-06');
    assert.ok(start < end);
  });
});
