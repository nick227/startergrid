import type { PrismaClient } from '@prisma/client';
import {
  hasRooftopAddressRecord,
  isGeocoded,
  parseRooftopAddress,
} from '../../lib/geo/rooftopAddress.js';

export type GeoVerifyReport = {
  totalProfiles:      number;
  withRooftopAddress: number;
  addressableProfiles: number;
  geocodedProfiles:   number;
  missingCoordinates: number;
};

export type GeoVerifyStrictOptions = {
  strict:     boolean;
  minPercent?: number;
};

export type GeoVerifyStrictResult = {
  ok:     boolean;
  detail: string;
};

export async function runGeoCoordinateVerify(prisma: PrismaClient): Promise<GeoVerifyReport> {
  const rows = await prisma.dealershipProfile.findMany({
    select: {
      rooftopAddress: true,
      rooftopLat:     true,
      rooftopLng:     true,
    },
  });

  let withRooftopAddress = 0;
  let addressableProfiles = 0;
  let geocodedProfiles = 0;
  let missingCoordinates = 0;

  for (const row of rows) {
    if (hasRooftopAddressRecord(row.rooftopAddress)) {
      withRooftopAddress++;
    }

    const addressable = parseRooftopAddress(row.rooftopAddress) != null;
    const geocoded = isGeocoded(row.rooftopLat, row.rooftopLng);

    if (addressable) {
      addressableProfiles++;
    }

    if (geocoded) {
      geocodedProfiles++;
    }

    if (addressable && !geocoded) {
      missingCoordinates++;
    }
  }

  return {
    totalProfiles: rows.length,
    withRooftopAddress,
    addressableProfiles,
    geocodedProfiles,
    missingCoordinates,
  };
}

export function geocodedAmongAddressable(report: GeoVerifyReport): number {
  return report.addressableProfiles - report.missingCoordinates;
}

export function geocodedPercentOfAddressable(report: GeoVerifyReport): number | null {
  if (report.addressableProfiles === 0) return null;
  return (geocodedAmongAddressable(report) / report.addressableProfiles) * 100;
}

export function evaluateGeoVerifyStrict(
  report: GeoVerifyReport,
  opts: GeoVerifyStrictOptions,
): GeoVerifyStrictResult {
  if (!opts.strict && opts.minPercent == null) {
    return { ok: true, detail: 'Strict checks disabled' };
  }

  if (opts.strict && report.addressableProfiles > 0 && geocodedAmongAddressable(report) === 0) {
    return {
      ok: false,
      detail: `${report.addressableProfiles} addressable profile(s) exist but none are geocoded`,
    };
  }

  if (opts.minPercent != null) {
    const pct = geocodedPercentOfAddressable(report);
    if (pct == null) {
      return { ok: true, detail: 'No addressable profiles — percent threshold skipped' };
    }
    if (pct < opts.minPercent) {
      return {
        ok: false,
        detail: `Geocoded ${pct.toFixed(1)}% of addressable profiles (minimum ${opts.minPercent}%)`,
      };
    }
  }

  return { ok: true, detail: 'Strict checks passed' };
}

export function formatGeoVerifyReport(report: GeoVerifyReport): string {
  const pct = geocodedPercentOfAddressable(report);
  const lines = [
    'Geo coordinate verification',
    '',
    `total profiles:          ${report.totalProfiles}`,
    `with rooftop address:    ${report.withRooftopAddress}`,
    `addressable profiles:    ${report.addressableProfiles}`,
    `geocoded profiles:       ${report.geocodedProfiles}`,
    `missing coordinates:     ${report.missingCoordinates}`,
  ];

  if (pct != null) {
    lines.push(`geocoded % (addressable): ${pct.toFixed(1)}%`);
  }

  return lines.join('\n');
}
