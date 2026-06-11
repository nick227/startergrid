import type { MarketplaceVehicleCard } from '../../../lib/api.ts';
import { CONDITION_SHORT, CONDITION_TONE } from '../../../lib/display.ts';
import { Badge } from '../../core/Badge.tsx';

type Props = { condition: MarketplaceVehicleCard['condition']; className?: string };

export function ConditionBadge({ condition, className = '' }: Props) {
  return (
    <Badge tone={CONDITION_TONE[condition]} className={className}>
      {CONDITION_SHORT[condition]}
    </Badge>
  );
}
