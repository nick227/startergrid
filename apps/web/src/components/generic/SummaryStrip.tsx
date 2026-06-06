export type SummaryItem = {
  key: string;
  label: string;
  value: number;
  colorClass: string;
};

type Props = {
  items: SummaryItem[];
  loading?: boolean;
  activeKey?: string;
  onItemClick?: (key: string) => void;
};

export function SummaryStrip({ items, loading, activeKey, onItemClick }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(item => {
        const isActive = activeKey === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onItemClick?.(item.key)}
            className={`surface-card-operator px-4 py-3 text-center transition-all
              ${isActive ? 'border-navy-500 ring-2 ring-cta-light' : 'hover:border-silver-300'}`}
          >
            <div className={`text-xl font-bold ${item.colorClass}`}>
              {loading
                ? <span className="inline-block w-8 h-5 bg-silver-100 rounded animate-pulse" />
                : item.value
              }
            </div>
            <div className="text-xs text-ink-faint mt-0.5">{item.label}</div>
          </button>
        );
      })}
    </div>
  );
}
