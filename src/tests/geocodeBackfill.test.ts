import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import type { GeocodeFn } from '../lib/geo/geocodeAddress.js';
import { runGeocodeBackfill } from '../services/geo/geocodeBackfillService.js';

// ── Minimal fake Prisma ────────────────────────────────────────────────────────

type FakeDealer = {
  id:             string;
  legalName:      string;
  rooftopAddress: unknown;
  rooftopLat?:    number | null;
  rooftopLng?:    number | null;
};

function fakePrisma(dealers: FakeDealer[]): {
  client: PrismaClient;
  writes: Array<{ id: string; lat: number; lng: number }>;
} {
  const writes: Array<{ id: string; lat: number; lng: number }> = [];

  const client = {
    dealershipProfile: {
      findMany: async ({ take }: { take?: number }) => {
        const rows = dealers.filter(d => d.rooftopLat == null || d.rooftopLng == null);
        return take != null ? rows.slice(0, take) : rows;
      },
      update: async ({ where, data }: { where: { id: string }; data: { rooftopLat: number; rooftopLng: number } }) => {
        writes.push({ id: where.id, lat: data.rooftopLat, lng: data.rooftopLng });
        return {};
      },
    },
  } as unknown as PrismaClient;

  return { client, writes };
}

// ── Geocoder stubs ─────────────────────────────────────────────────────────────

const goodGeocoder: GeocodeFn = async () => ({
  lat: 33.749, lng: -84.388, confidence: 8, provider: 'opencage',
});

const lowConfidenceGeocoder: GeocodeFn = async () => ({
  lat: 33.749, lng: -84.388, confidence: 3, provider: 'opencage',
});

const nullGeocoder: GeocodeFn = async () => null;

const throwingGeocoder: GeocodeFn = async () => {
  throw new Error('rate limit');
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('runGeocodeBackfill — dry-run mode', () => {
  it('reports correct totals without writing to DB', async () => {
    const dealers: FakeDealer[] = [
      { id: '1', legalName: 'Alpha Motors', rooftopAddress: { city: 'Atlanta', state: 'GA', postalCode: '30303', country: 'US' } },
      { id: '2', legalName: 'Beta Cars',   rooftopAddress: { city: 'Marietta', state: 'GA', postalCode: '30060', country: 'US' } },
    ];
    const { client, writes } = fakePrisma(dealers);
    const logs: string[] = [];

    const summary = await runGeocodeBackfill(
      client,
      goodGeocoder,
      { dryRun: true, minConfidence: 5 },
      msg => logs.push(msg),
    );

    assert.equal(summary.total, 2);
    assert.equal(summary.written, 2);   // dry-run counts as "would write"
    assert.equal(summary.skipped, 0);
    assert.equal(summary.failed, 0);
    assert.equal(writes.length, 0);     // no actual DB writes
    assert.ok(logs.some(l => l.includes('Dry-run')));
    assert.ok(logs.some(l => l.includes('DRY')));
  });
});

describe('runGeocodeBackfill — live write mode', () => {
  it('writes coordinates when geocoder returns confident result', async () => {
    const dealers: FakeDealer[] = [
      { id: '1', legalName: 'Alpha Motors', rooftopAddress: { city: 'Atlanta', state: 'GA', postalCode: '30303', country: 'US' } },
    ];
    const { client, writes } = fakePrisma(dealers);

    const summary = await runGeocodeBackfill(
      client,
      goodGeocoder,
      { dryRun: false, minConfidence: 5 },
      () => {},
    );

    assert.equal(summary.written, 1);
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.id, '1');
    assert.equal(writes[0]?.lat, 33.749);
  });

  it('skips dealers when geocoder confidence is below threshold', async () => {
    const dealers: FakeDealer[] = [
      { id: '1', legalName: 'Vague Autos', rooftopAddress: { city: 'Atlanta', state: 'GA' } },
    ];
    const { client, writes } = fakePrisma(dealers);

    const summary = await runGeocodeBackfill(
      client,
      lowConfidenceGeocoder,
      { dryRun: false, minConfidence: 5 },
      () => {},
    );

    assert.equal(summary.skipped, 1);
    assert.equal(summary.written, 0);
    assert.equal(writes.length, 0);
  });

  it('skips dealers when geocoder returns null', async () => {
    const dealers: FakeDealer[] = [
      { id: '1', legalName: 'No Match Motors', rooftopAddress: { city: 'Nowhere' } },
    ];
    const { client, writes } = fakePrisma(dealers);

    const summary = await runGeocodeBackfill(
      client,
      nullGeocoder,
      { dryRun: false, minConfidence: 5 },
      () => {},
    );

    assert.equal(summary.skipped, 1);
    assert.equal(writes.length, 0);
  });

  it('counts failures and continues when geocoder throws', async () => {
    const dealers: FakeDealer[] = [
      { id: '1', legalName: 'Good Dealer',  rooftopAddress: { city: 'Atlanta', state: 'GA' } },
      { id: '2', legalName: 'Error Dealer', rooftopAddress: { city: 'Atlanta', state: 'GA' } },
    ];
    const { client, writes } = fakePrisma(dealers);
    let callCount = 0;
    const partiallyThrowingGeocoder: GeocodeFn = async (addr) => {
      callCount++;
      if (callCount === 1) return { lat: 33.749, lng: -84.388, confidence: 9, provider: 'opencage' };
      throw new Error('rate limit');
    };

    const summary = await runGeocodeBackfill(
      client,
      partiallyThrowingGeocoder,
      { dryRun: false, minConfidence: 5 },
      () => {},
    );

    assert.equal(summary.written, 1);
    assert.equal(summary.failed, 1);
    assert.equal(writes.length, 1);
  });

  it('skips dealers with unparseable rooftopAddress', async () => {
    const dealers: FakeDealer[] = [
      { id: '1', legalName: 'Bad Data Inc', rooftopAddress: null },
    ];
    const { client, writes } = fakePrisma(dealers);

    const summary = await runGeocodeBackfill(
      client,
      goodGeocoder,
      { dryRun: false, minConfidence: 5 },
      () => {},
    );

    assert.equal(summary.skipped, 1);
    assert.equal(writes.length, 0);
  });

  it('respects the limit option', async () => {
    const dealers: FakeDealer[] = Array.from({ length: 5 }, (_, i) => ({
      id:             String(i + 1),
      legalName:      `Dealer ${i + 1}`,
      rooftopAddress: { city: 'Atlanta', state: 'GA' },
    }));
    const { client, writes } = fakePrisma(dealers);

    const summary = await runGeocodeBackfill(
      client,
      goodGeocoder,
      { dryRun: false, limit: 2, minConfidence: 5 },
      () => {},
    );

    assert.equal(summary.total, 2);
    assert.equal(writes.length, 2);
  });
});
