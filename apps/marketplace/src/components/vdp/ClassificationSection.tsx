import type { VehicleClassification } from '@dealer-marketplace/client';
import { formatMileage } from '../../lib/display.ts';
import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';

type Props = { classification: VehicleClassification };

export function ClassificationSection({ classification }: Props) {
  const rows = specRows([
    ['Mileage', formatMileage(classification.mileage)],
    ['Body style', classification.bodyStyle],
    ['Type', classification.vehicleType],
    ['Size', classification.vehicleSize],
    ['Doors', classification.doorCount],
    ['Seats', classification.seatCount],
    ['Prior use', classification.priorUse],
  ]);

  if (!hasSpecRows(rows)) return null;

  return (
    <SectionCard title="Overview">
      <SpecGrid specs={rows} />
    </SectionCard>
  );
}
