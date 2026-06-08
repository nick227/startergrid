const EARTH_RADIUS_MILES = 3958.7613;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/** Great-circle distance in miles between two WGS-84 coordinates. */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function cardDistanceMiles(
  buyerLat: number | undefined,
  buyerLng: number | undefined,
  sellerLat: number | null | undefined,
  sellerLng: number | null | undefined,
): number | undefined {
  if (buyerLat == null || buyerLng == null) return undefined;
  if (!Number.isFinite(buyerLat) || !Number.isFinite(buyerLng)) return undefined;
  if (sellerLat == null || sellerLng == null) return undefined;
  if (!Number.isFinite(sellerLat) || !Number.isFinite(sellerLng)) return undefined;
  return Math.round(haversineMiles(buyerLat, buyerLng, sellerLat, sellerLng));
}
