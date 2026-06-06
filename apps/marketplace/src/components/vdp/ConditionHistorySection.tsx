import type { VehicleConditionHistory } from '@dealer-marketplace/client';
import { SectionCard } from '../ui/SectionCard.tsx';
import { SpecGrid } from '../ui/SpecGrid.tsx';
import { hasSpecRows, specRows } from './specRows.ts';

type Props = { conditionHistory: VehicleConditionHistory };

export function ConditionHistorySection({ conditionHistory }: Props) {
  const rows = specRows([
    ['Title', conditionHistory.titleStatus],
    ['Accident history', conditionHistory.accidentHistory],
    ['Owners', conditionHistory.ownersCount],
    ['Service records', conditionHistory.serviceRecordsCount],
    ['Open recalls', conditionHistory.openRecalls],
    ['Inspection', conditionHistory.inspectionCompleted ? 'Completed' : null],
    ['Frame damage', conditionHistory.frameDamageReported ? 'Reported' : null],
  ]);

  if (!hasSpecRows(rows)) return null;

  return (
    <SectionCard title="Condition & history">
      <SpecGrid specs={rows} />
    </SectionCard>
  );
}
