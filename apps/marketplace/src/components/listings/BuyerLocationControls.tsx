import { useEffect, useState } from 'react';
import {
  DEFAULT_GEO_RADIUS_MILES,
  GEO_RADIUS_OPTIONS,
  isPostalOnlyPreference,
  type BuyerLocationPreference,
  type GeoRadiusMiles,
} from '../../features/location/buyerLocation.ts';
import { SectionCard } from '../ui/SectionCard.tsx';

type Props = {
  preference: BuyerLocationPreference | null;
  onApply: (draft: { postalCode: string; radiusMiles: GeoRadiusMiles; nationwide: boolean }) => void | Promise<void>;
  onNationwideChange: (nationwide: boolean) => void;
  onClear: () => void;
};

export function BuyerLocationControls({
  preference,
  onApply,
  onNationwideChange,
  onClear,
}: Props) {
  const [postalCode, setPostalCode] = useState(preference?.postalCode ?? '');
  const [radiusMiles, setRadiusMiles] = useState<GeoRadiusMiles>(
    preference?.radiusMiles ?? DEFAULT_GEO_RADIUS_MILES,
  );
  const nationwide = preference?.nationwide ?? false;
  const postalPending = isPostalOnlyPreference(preference);

  useEffect(() => {
    setPostalCode(preference?.postalCode ?? '');
    setRadiusMiles(preference?.radiusMiles ?? DEFAULT_GEO_RADIUS_MILES);
  }, [preference?.postalCode, preference?.radiusMiles]);

  useEffect(() => {
    void import('../../features/location/postalCoordinateLookup.ts')
      .then(module => module.preloadPostalCentroids());
  }, []);

  async function handleApply(event: React.FormEvent) {
    event.preventDefault();
    await onApply({ postalCode, radiusMiles, nationwide: false });
  }

  return (
    <SectionCard className="mb-4">
      <form onSubmit={handleApply} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mp-label text-ink-faint">Your location</p>
            <p className="text-sm text-ink-muted">Filter nearby listings by ZIP and radius.</p>
          </div>
          {preference && (
            <button
              type="button"
              onClick={onClear}
              className="mp-focus text-sm font-medium text-ink-muted hover:text-ink"
            >
              Clear location
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,8rem)_auto] sm:items-end">
          <label className="block space-y-1">
            <span className="mp-label text-ink-faint">ZIP / postal code</span>
            <input
              type="text"
              inputMode="text"
              autoComplete="postal-code"
              value={postalCode}
              onChange={event => setPostalCode(event.target.value)}
              placeholder="78701"
              disabled={nationwide}
              className="mp-input w-full"
              data-testid="buyer-postal-input"
            />
          </label>

          <label className="block space-y-1">
            <span className="mp-label text-ink-faint">Radius</span>
            <select
              value={radiusMiles}
              onChange={event => setRadiusMiles(Number(event.target.value) as GeoRadiusMiles)}
              disabled={nationwide}
              className="mp-input w-full"
              data-testid="buyer-radius-select"
            >
              {GEO_RADIUS_OPTIONS.map(option => (
                <option key={option} value={option}>{option} mi</option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={nationwide || !postalCode.trim()}
            className="mp-btn-primary w-full sm:w-auto"
            data-testid="buyer-location-apply"
          >
            Apply location
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-body">
          <input
            type="checkbox"
            checked={nationwide}
            onChange={event => onNationwideChange(event.target.checked)}
            data-testid="buyer-nationwide-toggle"
          />
          <span>Show nationwide inventory</span>
        </label>

        {postalPending && (
          <p className="text-sm text-amber-800" data-testid="buyer-location-pending">
            ZIP saved, but coordinate lookup is not available yet. Nearby filtering will apply once coordinates can be resolved.
          </p>
        )}

        {preference?.postalCode && !nationwide && preference.lat != null && preference.lng != null && (
          <p className="text-sm text-ink-muted" data-testid="buyer-location-active">
            Searching within {preference.radiusMiles} miles of {preference.postalCode}.
          </p>
        )}
      </form>
    </SectionCard>
  );
}
