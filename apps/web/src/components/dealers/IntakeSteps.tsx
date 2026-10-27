type Item = { id: string; label: string };

type Props = {
  presentation: 'chips' | 'rail';
  items: Item[];
  stepIndex: number;
  onSelect: (index: number) => void;
  title?: string;
  subtitle?: string;
};

function stepClass(index: number, stepIndex: number) {
  if (index === stepIndex) return 'border-navy-800 bg-navy-800 text-silver-100';
  if (index < stepIndex) return 'border-status-success-border bg-status-success-bg text-status-success-text';
  return 'border-silver-200 bg-surface-inset text-ink-muted';
}

function StepChips({ items, stepIndex, onSelect }: Omit<Props, 'presentation' | 'title' | 'subtitle'>) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => index <= stepIndex && onSelect(index)}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${stepClass(index, stepIndex)}`}
        >
          {index + 1}. {item.label}
        </button>
      ))}
    </div>
  );
}

export function IntakeSteps({ presentation, items, stepIndex, onSelect, title, subtitle }: Props) {
  if (presentation === 'chips') {
    return (
      <div className="space-y-5">
        {(title || subtitle) && (
          <div>
            {title && <h2 className="text-xl font-bold text-ink-heading">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
          </div>
        )}
        <StepChips items={items} stepIndex={stepIndex} onSelect={onSelect} />
      </div>
    );
  }

  const current = items[stepIndex];
  return (
    <nav aria-label="Registration steps" className="space-y-3">
      <p className="text-sm font-semibold text-ink-heading lg:hidden">
        {stepIndex + 1} of {items.length} · {current.label}
      </p>
      <div className="lg:hidden">
        <StepChips items={items} stepIndex={stepIndex} onSelect={onSelect} />
      </div>
      <ol className="hidden space-y-1 lg:block">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => index <= stepIndex && onSelect(index)}
              aria-current={index === stepIndex ? 'step' : undefined}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors ${stepClass(index, stepIndex)}`}
            >
              <span className="mr-2 tabular-nums">{index + 1}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
