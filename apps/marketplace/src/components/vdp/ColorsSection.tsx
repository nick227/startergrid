import type { VehicleColors } from '@dealer-marketplace/client';
import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';

type Props = { colors: VehicleColors };

export function ColorsSection({ colors }: Props) {
  const rows = specRows([
    ['Exterior', colors.exteriorColor],
    ['Interior', colors.interiorColor],
    ['Upholstery', colors.upholsteryMaterial],
  ]);

  if (!hasSpecRows(rows)) return null;

  return (
    <SectionCard title="Colors">
      <SpecGrid specs={rows} />
    </SectionCard>
  );
}
