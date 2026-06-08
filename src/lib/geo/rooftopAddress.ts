import type { GeocodeInput } from './geocodeAddress.js';

export function parseRooftopAddress(raw: unknown): GeocodeInput | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const addr = raw as Record<string, unknown>;
  const street     = typeof addr['street']     === 'string' ? addr['street']     : undefined;
  const city       = typeof addr['city']       === 'string' ? addr['city']       : undefined;
  const state      = typeof addr['state']      === 'string' ? addr['state']      : undefined;
  const postalCode = typeof addr['postalCode'] === 'string' ? addr['postalCode'] : undefined;
  const country    = typeof addr['country']    === 'string' ? addr['country']    : undefined;
  if (!city && !postalCode) return null;
  return { street, city, state, postalCode, country };
}

export function hasRooftopAddressRecord(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const addr = raw as Record<string, unknown>;
  return ['street', 'city', 'state', 'postalCode', 'country'].some(key => {
    const value = addr[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function isGeocoded(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}
