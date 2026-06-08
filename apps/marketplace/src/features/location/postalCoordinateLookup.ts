import { normalizeUsZip } from './normalizeUsZip.ts';

export type PostalCoordinates = {
  lat: number;
  lng: number;
};

type ZipCentroidMap = Record<string, { lat: number; lng: number }>;

let centroidsCache: ZipCentroidMap | null = null;
let centroidsLoad: Promise<ZipCentroidMap> | null = null;

function loadCentroids(): Promise<ZipCentroidMap> {
  if (centroidsCache) return Promise.resolve(centroidsCache);
  if (!centroidsLoad) {
    centroidsLoad = import('../../data/us-zip-centroids.json').then(mod => {
      centroidsCache = mod.default as ZipCentroidMap;
      return centroidsCache;
    });
  }
  return centroidsLoad;
}

/** Warm the centroid chunk when the location UI mounts. */
export function preloadPostalCentroids(): Promise<void> {
  return loadCentroids().then(() => undefined);
}

/**
 * Resolve a US ZIP/ZIP+4 to WGS-84 centroid coordinates using bundled Census ZCTA data.
 * Non-US postal codes return null. Loads the centroid dataset on first use.
 */
export async function lookupPostalCoordinates(postalCode: string): Promise<PostalCoordinates | null> {
  const zip = normalizeUsZip(postalCode);
  if (!zip) return null;
  const map = await loadCentroids();
  const hit = map[zip];
  if (!hit) return null;
  return { lat: hit.lat, lng: hit.lng };
}
