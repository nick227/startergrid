export const GEO_RADIUS_MIN_MILES = 1;
export const GEO_RADIUS_MAX_MILES = 500;
export const GEO_RADIUS_DEFAULT_MILES = 50;

export type GeoBoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function clampRadiusMiles(radiusMiles: number | undefined): number {
  const raw = radiusMiles ?? GEO_RADIUS_DEFAULT_MILES;
  if (!Number.isFinite(raw)) return GEO_RADIUS_DEFAULT_MILES;
  return Math.min(GEO_RADIUS_MAX_MILES, Math.max(GEO_RADIUS_MIN_MILES, Math.round(raw)));
}

export function geoBoundingBox(
  buyerLat: number,
  buyerLng: number,
  radiusMiles: number,
): GeoBoundingBox {
  const latDelta = radiusMiles / 69.0;
  const lngDelta = radiusMiles / (69.0 * Math.cos(buyerLat * (Math.PI / 180)));
  return {
    minLat: buyerLat - latDelta,
    maxLat: buyerLat + latDelta,
    minLng: buyerLng - lngDelta,
    maxLng: buyerLng + lngDelta,
  };
}

export function shouldApplyGeoRadiusFilter(input: {
  buyerLat?: number;
  buyerLng?: number;
  nationwide?: boolean;
}): boolean {
  if (input.nationwide === true) return false;
  const { buyerLat, buyerLng } = input;
  if (buyerLat == null || buyerLng == null) return false;
  if (!Number.isFinite(buyerLat) || !Number.isFinite(buyerLng)) return false;
  return true;
}
