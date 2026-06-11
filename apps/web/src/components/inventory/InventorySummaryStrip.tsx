

type Props = {
  counts: {
    active: number;
    ready: number;
    needsPhotos: number;
    queued: number;
    blocked: number;
  };
  activeFilter: string;
  onFilterChange: (filter: string) => void;
};

export function InventorySummaryStrip({ counts, activeFilter, onFilterChange }: Props) {
  const chips = [
    { id: 'All', label: `All ${counts.active}`, color: 'bg-silver-100 text-ink-body border-silver-200' },
    { id: 'Ready', label: `Ready ${counts.ready}`, color: 'bg-green-100 text-green-700 border-green-200' },
    { id: 'Needs photos', label: `Needs photos ${counts.needsPhotos}`, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    // Needs price omitted for now to keep it simpler if we don't have counts
    { id: 'Queued', label: `Queued ${counts.queued}`, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'Blocked', label: `Blocked ${counts.blocked}`, color: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'Sold', label: 'Sold', color: 'bg-silver-100 text-ink-body border-silver-200' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-silver-100">
      <div className="text-sm text-ink-body font-semibold mr-2">Filters:</div>
      {chips.map(chip => (
        <button
          key={chip.id}
          onClick={() => onFilterChange(chip.id)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
            activeFilter === chip.id ? 'ring-2 ring-navy-500 ring-offset-1 ' + chip.color : 'opacity-70 hover:opacity-100 ' + chip.color
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
