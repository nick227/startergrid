import {
  suggestGeoRelaxation,
  type GeoRelaxationAction,
} from '../../features/location/listingGeoRelaxation.ts';
import type { BuyerLocationPreference } from '../../features/location/buyerLocation.ts';

type Props = {
  preference: BuyerLocationPreference;
  onExpandRadius: (radiusMiles: GeoRelaxationAction & { type: 'expand_radius' }) => void;
  onNationwide: () => void;
};

export function GeoNoResultsRelaxation({
  preference,
  onExpandRadius,
  onNationwide,
}: Props) {
  const actions = suggestGeoRelaxation(preference);
  const radiusLabel = preference.radiusMiles;
  const postal = preference.postalCode ?? 'your ZIP';

  return (
    <div className="mp-card px-5 py-10 text-center sm:px-8 sm:py-12">
      <h2 className="text-xl font-semibold text-ink-heading">No listings nearby</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
        Nothing matched within {radiusLabel} miles of {postal}. Try a wider radius or search nationwide.
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {actions.map(action => (
          <button
            key={action.type === 'expand_radius' ? `radius-${action.radiusMiles}` : 'nationwide'}
            type="button"
            className={action.type === 'nationwide' ? 'mp-btn-primary' : 'mp-btn-secondary'}
            onClick={() => {
              if (action.type === 'expand_radius') onExpandRadius(action);
              else onNationwide();
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
