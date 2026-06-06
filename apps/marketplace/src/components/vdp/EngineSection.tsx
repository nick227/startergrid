import type { VehicleEngine } from '@dealer-marketplace/client';
import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';

type Props = { engine: VehicleEngine };

export function EngineSection({ engine }: Props) {
  const rows = specRows([
    ['Engine', engine.engineSize],
    ['Type', engine.engineType],
    ['Fuel', engine.fuelType],
    ['Cylinders', engine.cylinders],
    ['Horsepower', engine.horsepower],
    ['Torque', engine.torque],
    ['Transmission', engine.transmission],
    ['Drivetrain', engine.drivetrain],
  ]);

  if (!hasSpecRows(rows)) return null;

  return (
    <SectionCard title="Engine & drivetrain">
      <SpecGrid specs={rows} />
    </SectionCard>
  );
}
