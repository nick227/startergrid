
import { FilterChip } from '@/components/ui';

type Props = {
  counts: {
    active: number;
    ready: number;
    needsPhotos: number;
    queued: number;
    blocked: number;
    aging?: number;
  };
  activeFilter: string;
  onFilterChange: (filter: string) => void;
};

export function InventorySummaryStrip({ counts, activeFilter, onFilterChange }: Props) {
  const chips = [
    { id: 'All', label: `All ${counts.active}` },
    { id: 'Ready', label: `Ready to send ${counts.ready}` },
    { id: 'Needs photos', label: `Needs photos ${counts.needsPhotos}` },
    { id: 'Blocked', label: `Cannot list ${counts.blocked}` },
    ...(counts.aging !== undefined && counts.aging > 0
      ? [{ id: 'Aging', label: `Aging ${counts.aging}` }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
      {chips.map(chip => (
        <FilterChip
          key={chip.id}
          label={chip.label}
          selected={activeFilter === chip.id}
          onClick={() => onFilterChange(chip.id)}
        />
      ))}
    </div>
  );
}
