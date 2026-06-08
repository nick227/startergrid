import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import type { GeocodeFn } from '../lib/geo/geocodeAddress.js';
import { geocodeDealerIfNeeded } from '../services/geo/geocodeDealerService.js';

// ── Minimal fake Prisma ────────────────────────────────────────────────────────

type FakeRow = {
  rooftopAddress: unknown;
  rooftopLat:     number | null;
  rooftopLng:     number | null;
} | null;

function fakePrisma(row: FakeRow): {
  client: PrismaClient;
  writes: Array<{ lat: number; lng: number }>;
} {
  const writes: Array<{ lat: number; lng: number }> = [];

  const client = {
    dealershipProfile: {
      findUnique: async () => row,
      update: async ({ data }: { data: { rooftopLat: number; rooftopLng: number } }) => {
        writes.push({ lat: data.rooftopLat, lng: data.rooftopLng });
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

const throwingGeocoder: GeocodeFn = async () => {
  throw new Error('network timeout');
};

const validAddress = { city: 'Atlanta', state: 'GA', postalCode: '30303', country: 'US' };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('geocodeDealerIfNeeded', () => {
  it('geocodes and writes coordinates when lat/lng are missing', async () => {
    const { client, writes } = fakePrisma({
      rooftopAddress: validAddress,
      rooftopLat: null,
      rooftopLng: null,
    });

    const result = await geocodeDealerIfNeeded(client, 'dealer-1', goodGeocoder);

    assert.equal(result.status, 'updated');
    assert.ok(result.status === 'updated' && result.lat === 33.749);
    assert.ok(result.status === 'updated' && result.lng === -84.388);
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.lat, 33.749);
  });

  it('returns already_geocoded when both coords are present', async () => {
    const { client, writes } = fakePrisma({
      rooftopAddress: validAddress,
      rooftopLat: 33.749,
      rooftopLng: -84.388,
    });

    const result = await geocodeDealerIfNeeded(client, 'dealer-1', goodGeocoder);

    assert.equal(result.status, 'already_geocoded');
    assert.equal(writes.length, 0);
  });

  it('returns missing_address when dealer does not exist', async () => {
    const { client, writes } = fakePrisma(null);

    const result = await geocodeDealerIfNeeded(client, 'nonexistent', goodGeocoder);

    assert.equal(result.status, 'missing_address');
    assert.equal(writes.length, 0);
  });

  it('returns missing_address when rooftopAddress is unparseable', async () => {
    const { client, writes } = fakePrisma({
      rooftopAddress: null,
      rooftopLat: null,
      rooftopLng: null,
    });

    const result = await geocodeDealerIfNeeded(client, 'dealer-1', goodGeocoder);

    assert.equal(result.status, 'missing_address');
    assert.equal(writes.length, 0);
  });

  it('returns low_confidence when geocoder result is below threshold', async () => {
    const { client, writes } = fakePrisma({
      rooftopAddress: validAddress,
      rooftopLat: null,
      rooftopLng: null,
    });

    const result = await geocodeDealerIfNeeded(client, 'dealer-1', lowConfidenceGeocoder);

    assert.equal(result.status, 'low_confidence');
    assert.equal(writes.length, 0);
  });

  it('swallows geocoder throws and returns failed without propagating', async () => {
    const { client, writes } = fakePrisma({
      rooftopAddress: validAddress,
      rooftopLat: null,
      rooftopLng: null,
    });

    const result = await geocodeDealerIfNeeded(client, 'dealer-1', throwingGeocoder);

    assert.equal(result.status, 'failed');
    assert.ok(result.status === 'failed' && result.error.includes('network timeout'));
    assert.equal(writes.length, 0);
  });
});
