type Option<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
};

export function SegmentedControl<T extends string>({ label, value, onChange, options }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-silver-300 bg-silver-100 p-0.5">
      {options.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold ${
              selected ? 'bg-white text-ink-heading shadow-elevation-1' : 'text-ink-muted hover:text-ink-body'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="tabular-nums text-[10px] text-ink-faint">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
