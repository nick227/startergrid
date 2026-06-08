export const BUYER_LOCATION_STORAGE_KEY = 'mp:buyerLocation';

export const GEO_RADIUS_OPTIONS = [25, 50, 100, 250, 500] as const;
export type GeoRadiusMiles = (typeof GEO_RADIUS_OPTIONS)[number];

export const DEFAULT_GEO_RADIUS_MILES: GeoRadiusMiles = 50;

export type BuyerLocationPreference = {
  postalCode?: string;
  lat?: number;
  lng?: number;
  radiusMiles: GeoRadiusMiles;
  nationwide: boolean;
};

export type BuyerLocationDraft = {
  postalCode: string;
  radiusMiles: GeoRadiusMiles;
  nationwide: boolean;
};

export type BuyerGeoApiParams = {
  buyerLat?: number;
  buyerLng?: number;
  radiusMiles?: number;
  nationwide?: boolean;
};

const listeners = new Set<() => void>();

export function subscribeBuyerLocation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyBuyerLocationListeners(): void {
  for (const listener of listeners) listener();
}

export function normalizePostalCode(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

export function isGeoRadiusMiles(value: number): value is GeoRadiusMiles {
  return (GEO_RADIUS_OPTIONS as readonly number[]).includes(value);
}

export function resolveBuyerGeoApiParams(
  preference: BuyerLocationPreference | null,
): BuyerGeoApiParams {
  if (!preference) return {};
  if (preference.nationwide) return { nationwide: true };
  const { lat, lng } = preference;
  if (lat == null || lng == null) return {};
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return {};
  return {
    buyerLat: lat,
    buyerLng: lng,
    radiusMiles: preference.radiusMiles,
    nationwide: false,
  };
}

export function buyerGeoApiSignature(params: BuyerGeoApiParams): string {
  return JSON.stringify({
    buyerLat: params.buyerLat ?? null,
    buyerLng: params.buyerLng ?? null,
    radiusMiles: params.radiusMiles ?? null,
    nationwide: params.nationwide ?? null,
  });
}

export function getBuyerLocationSnapshot(): BuyerLocationPreference | null {
  return readBuyerLocationPreference();
}

export function readBuyerLocationPreference(): BuyerLocationPreference | null {
  try {
    const raw = sessionStorage.getItem(BUYER_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BuyerLocationPreference;
    if (typeof parsed !== 'object' || parsed == null) return null;
    const radiusMiles = isGeoRadiusMiles(parsed.radiusMiles)
      ? parsed.radiusMiles
      : DEFAULT_GEO_RADIUS_MILES;
    return {
      postalCode: typeof parsed.postalCode === 'string' ? parsed.postalCode : undefined,
      lat: typeof parsed.lat === 'number' && Number.isFinite(parsed.lat) ? parsed.lat : undefined,
      lng: typeof parsed.lng === 'number' && Number.isFinite(parsed.lng) ? parsed.lng : undefined,
      radiusMiles,
      nationwide: Boolean(parsed.nationwide),
    };
  } catch {
    return null;
  }
}

export function saveBuyerLocationPreference(preference: BuyerLocationPreference): void {
  sessionStorage.setItem(BUYER_LOCATION_STORAGE_KEY, JSON.stringify(preference));
  notifyBuyerLocationListeners();
}

export function clearBuyerLocationPreference(): void {
  sessionStorage.removeItem(BUYER_LOCATION_STORAGE_KEY);
  notifyBuyerLocationListeners();
}

export async function commitBuyerLocationDraft(draft: BuyerLocationDraft): Promise<BuyerLocationPreference> {
  const postalCode = normalizePostalCode(draft.postalCode);
  const { lookupPostalCoordinates } = await import('./postalCoordinateLookup.ts');
  const coords = postalCode ? await lookupPostalCoordinates(postalCode) : null;
  const preference: BuyerLocationPreference = {
    postalCode: postalCode || undefined,
    radiusMiles: draft.radiusMiles,
    nationwide: draft.nationwide,
    ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
  };
  saveBuyerLocationPreference(preference);
  return preference;
}

export function setBuyerLocationNationwide(nationwide: boolean): BuyerLocationPreference | null {
  const current = readBuyerLocationPreference();
  if (!current) {
    if (!nationwide) return null;
    const preference: BuyerLocationPreference = {
      radiusMiles: DEFAULT_GEO_RADIUS_MILES,
      nationwide: true,
    };
    saveBuyerLocationPreference(preference);
    return preference;
  }
  const next = { ...current, nationwide };
  saveBuyerLocationPreference(next);
  return next;
}

export function hasResolvableBuyerCoordinates(
  preference: BuyerLocationPreference | null,
): boolean {
  if (!preference || preference.nationwide) return false;
  return preference.lat != null
    && preference.lng != null
    && Number.isFinite(preference.lat)
    && Number.isFinite(preference.lng);
}

export function isPostalOnlyPreference(
  preference: BuyerLocationPreference | null,
): boolean {
  return Boolean(
    preference?.postalCode
    && !hasResolvableBuyerCoordinates(preference),
  );
}

export function saveBuyerLocationRadius(radiusMiles: GeoRadiusMiles): BuyerLocationPreference | null {
  const current = readBuyerLocationPreference();
  if (!current || !hasResolvableBuyerCoordinates(current)) return null;
  const next: BuyerLocationPreference = { ...current, radiusMiles, nationwide: false };
  saveBuyerLocationPreference(next);
  return next;
}
