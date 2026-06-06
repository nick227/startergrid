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
  green: 'bg-status-success-bg text-status-success-text border-status-success-border',
  amber: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
  red:   'bg-status-error-bg text-status-error-text border-status-error-border',
  slate: 'bg-navy-800 text-white border-navy-700',
};

const INACTIVE: Record<string, string> = {
  green: 'bg-surface-card text-ink-muted border-silver-200 hover:border-status-success-border hover:text-status-success-text',
  amber: 'bg-surface-card text-ink-muted border-silver-200 hover:border-status-warning-border hover:text-status-warning-text',
  red:   'bg-surface-card text-ink-muted border-silver-200 hover:border-status-error-border hover:text-status-error-text',
  slate: 'bg-surface-card text-ink-muted border-silver-200 hover:border-silver-300 hover:text-ink-body',
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
                ${isActive ? 'opacity-70' : 'text-ink-faint'}`}>
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
