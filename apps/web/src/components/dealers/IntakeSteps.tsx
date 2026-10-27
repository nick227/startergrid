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

function RailSteps({ items, stepIndex, onSelect, title, subtitle }: Omit<Props, 'presentation'>) {
  const current = items[stepIndex];
  return (
    <div className="mb-8 w-full text-center">
      <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
      {subtitle && <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/50">{subtitle}</p>}
      <p className="mt-5 text-sm text-white/70">{current.label}</p>
      <ol aria-label="Registration steps" className="mt-3 flex items-center justify-center gap-2">
        {items.map((item, index) => {
          const reached = index <= stepIndex;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => reached && onSelect(index)}
                aria-current={index === stepIndex ? 'step' : undefined}
                aria-label={item.label}
                className={`block h-1.5 w-6 rounded-full ${index === stepIndex ? 'bg-orange-500' : index < stepIndex ? 'bg-white' : 'bg-white/20'}`}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function IntakeSteps({ presentation, items, stepIndex, onSelect, title, subtitle }: Props) {
  if (presentation === 'rail') {
    return <RailSteps items={items} stepIndex={stepIndex} onSelect={onSelect} title={title} subtitle={subtitle} />;
  }

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
