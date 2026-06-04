export type Chip = {
  key: string;
  label: string;
  count?: number;
  color?: 'green' | 'amber' | 'red' | 'slate';
};

type Props = {
  chips: Chip[];
  activeKey?: string;
  onSelect: (key: string) => void;
};

const ACTIVE: Record<string, string> = {
  green: 'bg-green-100 text-green-700 border-green-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red:   'bg-red-100   text-red-700   border-red-200',
  slate: 'bg-slate-200 text-slate-700 border-slate-300',
};

const INACTIVE: Record<string, string> = {
  green: 'bg-white text-slate-500 border-slate-200 hover:border-green-300 hover:text-green-700',
  amber: 'bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-700',
  red:   'bg-white text-slate-500 border-slate-200 hover:border-red-300   hover:text-red-700',
  slate: 'bg-white text-slate-500 border-slate-200 hover:border-slate-400',
};

export function FilterChips({ chips, activeKey, onSelect }: Props) {
  if (!chips.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {chips.map(chip => {
        const color = chip.color ?? 'slate';
        const isActive = activeKey === chip.key;
        return (
          <button
            key={chip.key}
            onClick={() => onSelect(chip.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all
              ${isActive ? ACTIVE[color] : INACTIVE[color]}`}
          >
            {chip.label}
            {chip.count !== undefined && chip.count > 0 && (
              <span className={`text-xs font-bold leading-none
                ${isActive ? 'opacity-70' : 'text-slate-400'}`}>
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
