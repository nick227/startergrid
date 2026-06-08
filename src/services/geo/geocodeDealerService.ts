import type { PrismaClient } from '@prisma/client';
import type { GeocodeFn } from '../../lib/geo/geocodeAddress.js';
import { isGeocoded, parseRooftopAddress } from '../../lib/geo/rooftopAddress.js';

export type GeocodeDealerResult =
  | { status: 'updated';          lat: number; lng: number }
  | { status: 'already_geocoded' }
  | { status: 'missing_address'  }
  | { status: 'low_confidence'   }
  | { status: 'failed';           error: string };

const DEFAULT_MIN_CONFIDENCE = 5;

export async function geocodeDealerIfNeeded(
  prisma: PrismaClient,
  dealershipId: string,
  geocodeFn: GeocodeFn,
  minConfidence = DEFAULT_MIN_CONFIDENCE,
): Promise<GeocodeDealerResult> {
  try {
    const dealer = await prisma.dealershipProfile.findUnique({
      where:  { id: dealershipId },
      select: { rooftopAddress: true, rooftopLat: true, rooftopLng: true },
    });

    if (!dealer) return { status: 'missing_address' };
    if (isGeocoded(dealer.rooftopLat, dealer.rooftopLng)) return { status: 'already_geocoded' };

    const addr = parseRooftopAddress(dealer.rooftopAddress);
    if (!addr) return { status: 'missing_address' };

    const result = await geocodeFn(addr);
    if (!result || result.confidence < minConfidence) return { status: 'low_confidence' };

    await prisma.dealershipProfile.update({
      where: { id: dealershipId },
      data:  { rooftopLat: result.lat, rooftopLng: result.lng },
    });

    return { status: 'updated', lat: result.lat, lng: result.lng };
  } catch (err: unknown) {
    return { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }
}
