import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
  evaluateGeoVerifyStrict,
  formatGeoVerifyReport,
  runGeoCoordinateVerify,
} from '../services/geo/geoVerifyService.js';

type DealerRow = {
  rooftopAddress: unknown;
  rooftopLat:     number | null;
  rooftopLng:     number | null;
};

function fakePrisma(rows: DealerRow[]): PrismaClient {
  return {
    dealershipProfile: {
      findMany: async () => rows,
    },
  } as unknown as PrismaClient;
}

const address = {
  street: '1400 Mockingbird Lane',
  city: 'Austin',
  state: 'TX',
  postalCode: '78701',
  country: 'US',
};

describe('runGeoCoordinateVerify', () => {
  it('counts total, addressable, geocoded, and missing coordinates', async () => {
    const report = await runGeoCoordinateVerify(fakePrisma([
      { rooftopAddress: address, rooftopLat: 30.27, rooftopLng: -97.74 },
      { rooftopAddress: address, rooftopLat: null, rooftopLng: null },
      { rooftopAddress: {}, rooftopLat: null, rooftopLng: null },
    ]));

    assert.equal(report.totalProfiles, 3);
    assert.equal(report.withRooftopAddress, 2);
    assert.equal(report.addressableProfiles, 2);
    assert.equal(report.geocodedProfiles, 1);
    assert.equal(report.missingCoordinates, 1);
  });
});

describe('evaluateGeoVerifyStrict', () => {
  const partialReport = {
    totalProfiles: 2,
    withRooftopAddress: 2,
    addressableProfiles: 2,
    geocodedProfiles: 0,
    missingCoordinates: 2,
  };

  it('fails strict mode when addressable profiles are not geocoded', () => {
    const result = evaluateGeoVerifyStrict(partialReport, { strict: true });
    assert.equal(result.ok, false);
  });

  it('passes strict mode when no addressable profiles exist', () => {
    const result = evaluateGeoVerifyStrict({
      totalProfiles: 1,
      withRooftopAddress: 0,
      addressableProfiles: 0,
      geocodedProfiles: 0,
      missingCoordinates: 0,
    }, { strict: true });
    assert.equal(result.ok, true);
  });

  it('enforces GEO_VERIFY_MIN_PERCENT threshold', () => {
    const report = {
      totalProfiles: 10,
      withRooftopAddress: 10,
      addressableProfiles: 10,
      geocodedProfiles: 7,
      missingCoordinates: 3,
    };
    assert.equal(evaluateGeoVerifyStrict(report, { strict: false, minPercent: 80 }).ok, false);
    assert.equal(evaluateGeoVerifyStrict(report, { strict: false, minPercent: 70 }).ok, true);
  });
});

describe('formatGeoVerifyReport', () => {
  it('prints deployment-friendly counts', () => {
    const text = formatGeoVerifyReport({
      totalProfiles: 5,
      withRooftopAddress: 4,
      addressableProfiles: 4,
      geocodedProfiles: 3,
      missingCoordinates: 1,
    });
    assert.match(text, /total profiles:\s+5/);
    assert.match(text, /addressable profiles:\s+4/);
    assert.match(text, /geocoded profiles:\s+3/);
    assert.match(text, /missing coordinates:\s+1/);
    assert.match(text, /geocoded % \(addressable\): 75\.0%/);
  });
});
