import { formatPrice } from '../../../lib/display.ts';
import { Badge } from '../../core/Badge.tsx';

type Props = {
  originalPriceCents: number | null | undefined;
  priceCents: number;
  className?: string;
};

export function PriceDropBadge({ originalPriceCents, priceCents, className = '' }: Props) {
  if (originalPriceCents == null || originalPriceCents <= priceCents) return null;

  const dropCents = originalPriceCents - priceCents;
  const dropPct   = Math.round((dropCents / originalPriceCents) * 100);

  return (
    <Badge tone="rose" className={className}>
      ↓ {dropPct}% — was {formatPrice(originalPriceCents)}
    </Badge>
  );
}
