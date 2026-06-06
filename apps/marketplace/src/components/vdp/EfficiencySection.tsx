import type { VehicleEfficiency } from '@dealer-marketplace/client';
import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';

type Props = { efficiency: VehicleEfficiency };

export function EfficiencySection({ efficiency }: Props) {
  const rows = specRows([
    ['City MPG', efficiency.cityMpg],
    ['Highway MPG', efficiency.highwayMpg],
    ['Combined MPG', efficiency.combinedMpg],
    ['MPGe', efficiency.mpge],
    ['Electric range', efficiency.electricRangeMiles != null ? `${efficiency.electricRangeMiles} mi` : null],
    ['Battery', efficiency.batteryCapacityKwh != null ? `${efficiency.batteryCapacityKwh} kWh` : null],
    ['Charging', efficiency.chargingType],
  ]);

  if (!hasSpecRows(rows)) return null;

  return (
    <SectionCard title="Efficiency">
      <SpecGrid specs={rows} />
    </SectionCard>
  );
}
