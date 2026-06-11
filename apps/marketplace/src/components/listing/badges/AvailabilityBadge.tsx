import type { CategorySchema } from '@auto-dealer/category-schemas';
import type { ListingAvailabilityStatus } from '../../../features/availability/listingAvailability.ts';
import {
  getAvailabilityLabel,
  shouldShowAvailabilityOnCard,
} from '../../../features/availability/listingAvailability.ts';

type Props = {
  schema: CategorySchema;
  status: ListingAvailabilityStatus | undefined;
  className?: string;
};

export function AvailabilityBadge({ schema, status, className = '' }: Props) {
  if (!shouldShowAvailabilityOnCard(status)) return null;

  const label = getAvailabilityLabel(schema, status);
  if (!label) return null;

  return (
    <span className={['rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900', className].join(' ')}>
      {label}
    </span>
  );
}
