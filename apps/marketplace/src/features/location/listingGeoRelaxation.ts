import {
  GEO_RADIUS_OPTIONS,
  hasResolvableBuyerCoordinates,
  type BuyerLocationPreference,
  type GeoRadiusMiles,
} from './buyerLocation.ts';

export type GeoRelaxationAction =
  | { type: 'expand_radius'; radiusMiles: GeoRadiusMiles; label: string }
  | { type: 'nationwide'; label: string };

export function isGeoRadiusSearchActive(
  preference: BuyerLocationPreference | null,
): boolean {
  return hasResolvableBuyerCoordinates(preference) && !preference?.nationwide;
}

export function nextGeoRadiusMiles(current: GeoRadiusMiles): GeoRadiusMiles | null {
  const index = GEO_RADIUS_OPTIONS.indexOf(current);
  if (index < 0 || index >= GEO_RADIUS_OPTIONS.length - 1) return null;
  return GEO_RADIUS_OPTIONS[index + 1] ?? null;
}

export function suggestGeoRelaxation(
  preference: BuyerLocationPreference | null,
): GeoRelaxationAction[] {
  if (!isGeoRadiusSearchActive(preference) || !preference) return [];

  const actions: GeoRelaxationAction[] = [];
  const nextRadius = nextGeoRadiusMiles(preference.radiusMiles);
  if (nextRadius) {
    actions.push({
      type: 'expand_radius',
      radiusMiles: nextRadius,
      label: `Expand to ${nextRadius} miles`,
    });
  }
  actions.push({ type: 'nationwide', label: 'Search nationwide' });
  return actions;
}
