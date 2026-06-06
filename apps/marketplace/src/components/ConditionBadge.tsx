import type { MarketplaceVehicleCard } from '../lib/api.ts';
import { CONDITION_LABEL, CONDITION_STYLE } from '../lib/vehicleDisplay.ts';

type Props = { condition: MarketplaceVehicleCard['condition']; className?: string };

export function ConditionBadge({ condition, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${CONDITION_STYLE[condition]} ${className}`}
    >
      {CONDITION_LABEL[condition]}
    </span>
  );
}
