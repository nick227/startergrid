import type { VehicleWarranty } from '@dealer-marketplace/client';
import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';

type Props = { warranty: VehicleWarranty };

export function WarrantySection({ warranty }: Props) {
  const rows = specRows([
    ['Factory warranty', warranty.factoryWarrantyRemaining],
    ['Warranty details', warranty.warrantyDescription],
    ['Certified program', warranty.certifiedProgramName],
    ['Return policy', warranty.returnPolicyDays != null ? `${warranty.returnPolicyDays} days` : null],
    ['Protection plans', warranty.protectionPlansAvailable ? 'Available' : null],
  ]);

  if (!hasSpecRows(rows)) return null;

  return (
    <SectionCard title="Warranty & protection">
      <SpecGrid specs={rows} columns={1} />
    </SectionCard>
  );
}
