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
  bare?: boolean;
};

export function BuyerLocationControls({
  preference,
  onApply,
  onNationwideChange,
  onClear,
  bare = false,
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

  const form = (
    <form onSubmit={handleApply} className="space-y-2">
      <p className="text-xs text-ink-muted">Filter nearby listings by ZIP and radius.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block space-y-1">
          <span className="mp-label text-ink-faint">ZIP</span>
          <input
            type="text"
            inputMode="text"
            autoComplete="postal-code"
            value={postalCode}
            onChange={event => setPostalCode(event.target.value)}
            placeholder="78701"
            disabled={nationwide}
            className="mp-input h-10 w-28 py-1"
            data-testid="buyer-postal-input"
          />
        </label>
        <label className="block space-y-1">
          <span className="mp-label text-ink-faint">Radius</span>
          <select
            value={radiusMiles}
            onChange={event => setRadiusMiles(Number(event.target.value) as GeoRadiusMiles)}
            disabled={nationwide}
            className="mp-input h-10 w-24 py-1"
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
          className="mp-btn-primary !h-10 !min-h-0 px-4"
          data-testid="buyer-location-apply"
        >
          Apply
        </button>
        <label className="flex h-10 items-center gap-2 text-sm text-ink-body">
          <input
            type="checkbox"
            checked={nationwide}
            onChange={event => onNationwideChange(event.target.checked)}
            data-testid="buyer-nationwide-toggle"
          />
          <span>Nationwide</span>
        </label>
        {preference && (
          <button
            type="button"
            onClick={onClear}
            className="mp-focus h-10 text-sm font-medium text-ink-muted hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>
      {postalPending && (
        <p className="text-xs text-amber-800" data-testid="buyer-location-pending">
          ZIP saved, but coordinate lookup is not available yet. Nearby filtering will apply once coordinates can be resolved.
        </p>
      )}
      {preference?.postalCode && !nationwide && preference.lat != null && preference.lng != null && (
        <p className="text-xs text-ink-muted" data-testid="buyer-location-active">
          Searching within {preference.radiusMiles} miles of {preference.postalCode}.
        </p>
      )}
    </form>
  );

  if (bare) return form;
  return <SectionCard className="mb-4">{form}</SectionCard>;
}
