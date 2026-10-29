import type { VehicleClassification } from '@dealer-marketplace/client';
import { formatMileage, formatUsage } from '../../lib/display.ts';
import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';
import { useCategorySchema } from '../../contexts/CategoryContext.tsx';

type Props = { classification: VehicleClassification };

export function ClassificationSection({ classification }: Props) {
  const schema = useCategorySchema();
  const isAuto = schema.id === 'AUTOMOTIVE';
  const isMarine = schema.id === 'BOATS';

  const rows = isMarine
    ? specRows([
        ['Hours', classification.mileage ? formatUsage(classification.mileage, 'hours') : null],
        ['Vessel type', classification.unitType],
        ['Length', classification.lengthFt ? `${classification.lengthFt} ft` : null],
        ['Prior use', classification.priorUse],
      ])
    : isAuto
    ? specRows([
        ['Mileage', formatMileage(classification.mileage)],
        ['Body style', classification.bodyStyle],
        ['Type', classification.vehicleType],
        ['Size', classification.vehicleSize],
        ['Doors', classification.doorCount],
        ['Seats', classification.seatCount],
        ['Prior use', classification.priorUse],
      ])
    : specRows([
        ['Usage', classification.mileage ? formatUsage(classification.mileage, classification.usageUnit as any) : null],
        ['Type', classification.unitType],
      ]);

  if (!hasSpecRows(rows)) return null;

  return (
    <SectionCard title="Overview">
      <SpecGrid specs={rows} />
    </SectionCard>
  );
}

