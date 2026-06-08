import centroids from '../../data/us-zip-centroids.json';
import { normalizeUsZip } from './normalizeUsZip.ts';

export type PostalCoordinates = {
  lat: number;
  lng: number;
};

type ZipCentroidMap = Record<string, { lat: number; lng: number }>;

const ZIP_CENTROIDS = centroids as ZipCentroidMap;

/**
 * Resolve a US ZIP/ZIP+4 to WGS-84 centroid coordinates using bundled Census ZCTA data.
 * Non-US postal codes return null. No network calls.
 */
export function lookupPostalCoordinates(postalCode: string): PostalCoordinates | null {
  const zip = normalizeUsZip(postalCode);
  if (!zip) return null;
  const hit = ZIP_CENTROIDS[zip];
  if (!hit) return null;
  return { lat: hit.lat, lng: hit.lng };
}
