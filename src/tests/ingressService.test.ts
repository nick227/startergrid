import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_CSV_SOURCE,
  DEFAULT_JSON_SOURCE,
  deriveIngressStatus,
  type IngressSourceView,
  type IngressRunView,
  type CreateIngressRunOpts,
} from '../services/inventory/ingressService.js';
import { validateBody, createIngressSourceSchema, updateIngressSourceSchema } from '../server/requestValidation.js';

// ── DEFAULT_CSV_SOURCE constant ───────────────────────────────────────────────

describe('DEFAULT_CSV_SOURCE', () => {
  it('has the correct slug', () => {
    assert.equal(DEFAULT_CSV_SOURCE.slug, 'csv-manual');
  });
  it('has kind CSV', () => {
    assert.equal(DEFAULT_CSV_SOURCE.kind, 'CSV');
  });
  it('has a non-empty label', () => {
    assert.ok(DEFAULT_CSV_SOURCE.label.length > 0);
  });
});

// ── deriveIngressStatus ───────────────────────────────────────────────────────

describe('deriveIngressStatus', () => {
  it('no errors → COMMITTED', () => {
    assert.equal(deriveIngressStatus(10, 0, 0), 'COMMITTED');
    assert.equal(deriveIngressStatus(0, 5, 0), 'COMMITTED');
    assert.equal(deriveIngressStatus(3, 2, 0), 'COMMITTED');
  });

  it('errors + some rows committed → PARTIAL', () => {
    assert.equal(deriveIngressStatus(5, 0, 2), 'PARTIAL');
    assert.equal(deriveIngressStatus(0, 3, 1), 'PARTIAL');
    assert.equal(deriveIngressStatus(1, 1, 10), 'PARTIAL');
  });

  it('errors + nothing committed → FAILED', () => {
    assert.equal(deriveIngressStatus(0, 0, 5), 'FAILED');
    assert.equal(deriveIngressStatus(0, 0, 1), 'FAILED');
  });

  it('zero everything → COMMITTED (empty import is technically complete)', () => {
    assert.equal(deriveIngressStatus(0, 0, 0), 'COMMITTED');
  });
});

// ── IngressSourceView shape ───────────────────────────────────────────────────

describe('IngressSourceView shape', () => {
  const fixture: IngressSourceView = {
    id:            'src-1',
    slug:          'csv-manual',
    label:         'Manual Upload',
    kind:          'CSV',
    status:        'ACTIVE',
    feedUrl:             null,
    lastCheckError:      null,
    pollIntervalMinutes: null,
    nextCheckAt:         null,
    lastReceivedAt:      null,
    lastCheckedAt:       null,
    createdAt:     new Date().toISOString(),
    updatedAt:     new Date().toISOString(),
  };

  it('has all required string fields', () => {
    assert.equal(typeof fixture.id, 'string');
    assert.equal(typeof fixture.slug, 'string');
    assert.equal(typeof fixture.label, 'string');
    assert.equal(typeof fixture.kind, 'string');
    assert.equal(typeof fixture.status, 'string');
  });

  it('nullable timestamp fields default to null', () => {
    assert.equal(fixture.lastReceivedAt, null);
    assert.equal(fixture.lastCheckedAt,  null);
  });
});

// ── IngressRunView shape ──────────────────────────────────────────────────────

describe('IngressRunView shape', () => {
  const fixture: IngressRunView = {
    id:           'run-1',
    sourceId:     'src-1',
    sourceLabel:  'Manual Upload',
    sourceKind:   'CSV',
    status:       'COMMITTED',
    receivedAt:   new Date().toISOString(),
    completedAt:  new Date().toISOString(),
    vehicleCount: 10,
    createdCount:  8,
    updatedCount:  2,
    skippedCount:  0,
    blockedCount:  0,
    errorCount:    0,
    summaryJson:  null,
    platformImpactJson: null,
  };

  it('has required count fields as numbers', () => {
    assert.equal(typeof fixture.vehicleCount, 'number');
    assert.equal(typeof fixture.createdCount, 'number');
    assert.equal(typeof fixture.updatedCount, 'number');
    assert.equal(typeof fixture.skippedCount, 'number');
    assert.equal(typeof fixture.blockedCount, 'number');
    assert.equal(typeof fixture.errorCount,   'number');
  });

  it('sourceId and sourceLabel can be null (headless run)', () => {
    const headless: IngressRunView = { ...fixture, sourceId: null, sourceLabel: null };
    assert.equal(headless.sourceId,    null);
    assert.equal(headless.sourceLabel, null);
  });

  it('completedAt can be null (in-flight)', () => {
    const inflight: IngressRunView = { ...fixture, completedAt: null };
    assert.equal(inflight.completedAt, null);
  });
});

// ── CreateIngressRunOpts type coverage ────────────────────────────────────────

describe('CreateIngressRunOpts type', () => {
  it('can represent a complete CSV import run', () => {
    const opts: CreateIngressRunOpts = {
      dealershipId: 'dealer-1',
      sourceId:     'src-1',
      sourceKind:   'CSV',
      status:       'COMMITTED',
      receivedAt:   new Date(),
      completedAt:  new Date(),
      vehicleCount: 15,
      createdCount: 12,
      updatedCount:  3,
      skippedCount:  0,
      blockedCount:  0,
      errorCount:    0,
      mappingJson:  { 'Stock': 'stockNumber', 'Make': 'make' },
      summaryJson:  { rowCount: 15, mappedFields: ['stockNumber', 'make'] },
    };
    assert.equal(opts.vehicleCount, 15);
    assert.equal(opts.sourceKind, 'CSV');
  });

  it('sourceId can be null (no configured source)', () => {
    const opts: CreateIngressRunOpts = {
      dealershipId: 'dealer-1',
      sourceId:     null,
      sourceKind:   'MANUAL',
      status:       'COMMITTED',
      receivedAt:   new Date(),
      completedAt:  new Date(),
      vehicleCount: 1, createdCount: 1, updatedCount: 0,
      skippedCount: 0, blockedCount: 0, errorCount:   0,
    };
    assert.equal(opts.sourceId, null);
  });
});

// ── deriveIngressStatus boundary cases ───────────────────────────────────────

describe('deriveIngressStatus — boundary cases', () => {
  it('exactly one error, one success → PARTIAL', () => {
    assert.equal(deriveIngressStatus(1, 0, 1), 'PARTIAL');
  });

  it('many errors, no success → FAILED', () => {
    assert.equal(deriveIngressStatus(0, 0, 1000), 'FAILED');
  });

  it('many errors, some success → PARTIAL regardless of ratio', () => {
    assert.equal(deriveIngressStatus(1, 0, 999), 'PARTIAL');
  });

  it('updated only (no creates), no errors → COMMITTED', () => {
    assert.equal(deriveIngressStatus(0, 50, 0), 'COMMITTED');
  });
});

// ── DEFAULT_JSON_SOURCE constant ──────────────────────────────────────────────

describe('DEFAULT_JSON_SOURCE', () => {
  it('has slug json-manual', () => assert.equal(DEFAULT_JSON_SOURCE.slug, 'json-manual'));
  it('has kind JSON',        () => assert.equal(DEFAULT_JSON_SOURCE.kind, 'JSON'));
  it('has non-empty label',  () => assert.ok(DEFAULT_JSON_SOURCE.label.length > 0));
});

// ── IngressSourceView shape with feedUrl ─────────────────────────────────────

describe('IngressSourceView with feedUrl', () => {
  it('accepts feedUrl as null for non-API sources', () => {
    const v: IngressSourceView = {
      id: 's1', slug: 'csv-manual', label: 'Manual Upload',
      kind: 'CSV', status: 'ACTIVE', feedUrl: null, lastCheckError: null,
      pollIntervalMinutes: null, nextCheckAt: null,
      lastReceivedAt: null, lastCheckedAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    assert.equal(v.feedUrl, null);
    assert.equal(v.pollIntervalMinutes, null);
    assert.equal(v.nextCheckAt, null);
  });

  it('accepts feedUrl, polling schedule, and lastCheckError for API sources', () => {
    const v: IngressSourceView = {
      id: 's2', slug: 'my-api', label: 'My API',
      kind: 'API', status: 'ERROR',
      feedUrl: 'https://api.example.com/feed',
      lastCheckError: 'Feed returned HTTP 503',
      pollIntervalMinutes: 60,
      nextCheckAt: new Date().toISOString(),
      lastReceivedAt: null, lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    assert.equal(v.feedUrl, 'https://api.example.com/feed');
    assert.ok(v.lastCheckError?.includes('503'));
    assert.equal(v.pollIntervalMinutes, 60);
  });
});

// ── createIngressSourceSchema ─────────────────────────────────────────────────

describe('createIngressSourceSchema — valid inputs', () => {
  it('accepts label + HTTPS feedUrl', () => {
    const r = validateBody(createIngressSourceSchema, {
      label: 'My DMS Feed', feedUrl: 'https://api.example.com/inventory'
    });
    assert.ok(r.ok);
  });

  it('accepts optional sourceSlug, status, and pollIntervalMinutes', () => {
    const r = validateBody(createIngressSourceSchema, {
      label: 'My Feed', feedUrl: 'https://feed.example.com',
      sourceSlug: 'my-feed', status: 'PAUSED', pollIntervalMinutes: 60,
    });
    assert.ok(r.ok);
  });

  it('accepts pollIntervalMinutes: null (no schedule)', () => {
    const r = validateBody(createIngressSourceSchema, {
      label: 'My Feed', feedUrl: 'https://x.com', pollIntervalMinutes: null,
    });
    assert.ok(r.ok);
  });
});

describe('createIngressSourceSchema — invalid inputs', () => {
  it('rejects missing label', () => {
    const r = validateBody(createIngressSourceSchema, { feedUrl: 'https://a.com' });
    assert.ok(!r.ok);
  });

  it('rejects HTTP feedUrl', () => {
    const r = validateBody(createIngressSourceSchema, {
      label: 'Feed', feedUrl: 'http://insecure.example.com/feed'
    });
    assert.ok(!r.ok);
    assert.ok(r.error.includes('HTTPS'));
  });

  it('rejects empty feedUrl', () => {
    const r = validateBody(createIngressSourceSchema, { label: 'Feed', feedUrl: '' });
    assert.ok(!r.ok);
  });

  it('rejects invalid status', () => {
    const r = validateBody(createIngressSourceSchema, {
      label: 'Feed', feedUrl: 'https://x.com', status: 'BROKEN'
    });
    assert.ok(!r.ok);
  });

  it('rejects unknown keys (strict)', () => {
    const r = validateBody(createIngressSourceSchema, {
      label: 'Feed', feedUrl: 'https://x.com', extra: 'oops'
    });
    assert.ok(!r.ok);
  });
});

// ── updateIngressSourceSchema ─────────────────────────────────────────────────

describe('updateIngressSourceSchema — valid inputs', () => {
  it('accepts status-only update', () => {
    const r = validateBody(updateIngressSourceSchema, { status: 'PAUSED' });
    assert.ok(r.ok);
  });

  it('accepts label-only update', () => {
    const r = validateBody(updateIngressSourceSchema, { label: 'New Label' });
    assert.ok(r.ok);
  });

  it('accepts feedUrl-only update', () => {
    const r = validateBody(updateIngressSourceSchema, { feedUrl: 'https://new.example.com' });
    assert.ok(r.ok);
  });

  it('accepts all fields at once including pollIntervalMinutes', () => {
    const r = validateBody(updateIngressSourceSchema, {
      label: 'Updated', feedUrl: 'https://new.example.com', status: 'ACTIVE',
      pollIntervalMinutes: 120,
    });
    assert.ok(r.ok);
  });

  it('accepts pollIntervalMinutes: null to remove schedule', () => {
    const r = validateBody(updateIngressSourceSchema, { pollIntervalMinutes: null });
    assert.ok(r.ok);
  });

  it('rejects pollIntervalMinutes below minimum (5)', () => {
    const r = validateBody(updateIngressSourceSchema, { pollIntervalMinutes: 4 });
    assert.ok(!r.ok);
  });

  it('accepts DISCONNECTED and ERROR status values', () => {
    assert.ok(validateBody(updateIngressSourceSchema, { status: 'DISCONNECTED' }).ok);
    assert.ok(validateBody(updateIngressSourceSchema, { status: 'ERROR' }).ok);
  });
});

describe('updateIngressSourceSchema — invalid inputs', () => {
  it('rejects empty body', () => {
    const r = validateBody(updateIngressSourceSchema, {});
    assert.ok(!r.ok);
  });

  it('rejects HTTP feedUrl', () => {
    const r = validateBody(updateIngressSourceSchema, { feedUrl: 'http://not-https.com' });
    assert.ok(!r.ok);
    assert.ok(r.error.includes('HTTPS'));
  });

  it('rejects empty label string', () => {
    const r = validateBody(updateIngressSourceSchema, { label: '' });
    assert.ok(!r.ok);
  });

  it('rejects unknown keys (strict)', () => {
    const r = validateBody(updateIngressSourceSchema, { status: 'ACTIVE', extra: 'oops' });
    assert.ok(!r.ok);
  });
});
