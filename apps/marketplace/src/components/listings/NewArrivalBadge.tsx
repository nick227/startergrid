import { isNewArrival, NEW_ARRIVAL_LABEL } from '../../features/listings/listingBadges.ts';
import { Badge } from '../ui/Badge.tsx';

type Props = {
  listedAt: string | null | undefined;
  className?: string;
};

export function NewArrivalBadge({ listedAt, className = '' }: Props) {
  if (!isNewArrival(listedAt)) return null;

  return (
    <Badge tone="emerald" className={className}>
      {NEW_ARRIVAL_LABEL}
    </Badge>
  );
}
