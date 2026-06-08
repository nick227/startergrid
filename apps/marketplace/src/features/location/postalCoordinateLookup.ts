export type PostalCoordinates = {
  lat: number;
  lng: number;
};

/**
 * Resolve a postal/ZIP code to WGS-84 coordinates using local data only.
 *
 * Gap: no ZIP centroid dataset is bundled with the marketplace app yet.
 * Returns null until a lightweight lookup table or static import is added.
 * Do not call external geocoding APIs from the browser.
 */
export function lookupPostalCoordinates(_postalCode: string): PostalCoordinates | null {
  return null;
}
