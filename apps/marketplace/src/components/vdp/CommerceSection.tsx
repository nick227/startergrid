import type { VehicleCommerce } from '@dealer-marketplace/client';
import { formatListedDate, formatPrice } from '../../lib/display.ts';
import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';

type Props = { commerce: VehicleCommerce };

export function CommerceSection({ commerce }: Props) {
  const rows = specRows([
    ['Original price', commerce.originalPriceCents != null ? formatPrice(commerce.originalPriceCents) : null],
    ['Shipping', commerce.shippingPriceCents != null ? formatPrice(commerce.shippingPriceCents) : null],
    ['Est. arrival', commerce.estimatedArrival],
    ['Listed', formatListedDate(commerce.listedAt)],
  ]);

  if (!hasSpecRows(rows)) return null;

  return (
    <SectionCard title="Price">
      <SpecGrid specs={rows} columns={1} />
    </SectionCard>
  );
}
