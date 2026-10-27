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

function pad(index: number) {
  return String(index + 1).padStart(2, '0');
}

function RailSteps({ items, stepIndex, onSelect, title, subtitle }: Omit<Props, 'presentation'>) {
  const current = items[stepIndex];
  return (
    <nav
      aria-label="Registration steps"
      className="flex flex-col bg-navy-950 px-5 py-8 text-white sm:px-8 lg:min-h-[calc(100svh-4rem)] lg:justify-between lg:px-10 lg:py-14"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-navy-500">New dealership</p>
        <p aria-hidden="true" className="mt-4 text-5xl font-light tabular-nums leading-none tracking-[-0.06em] text-white lg:mt-8 lg:text-7xl">
          {pad(stepIndex)}
        </p>
        <h1 className="mt-3 max-w-[14rem] text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.03em] lg:mt-4 lg:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-silver-300 lg:hidden">{current.label}</p>

        <ol className="mt-6 flex gap-1.5 lg:hidden">
          {items.map((item, index) => {
            const reached = index <= stepIndex;
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => reached && onSelect(index)}
                  aria-current={index === stepIndex ? 'step' : undefined}
                  aria-label={`${pad(index)} ${item.label}`}
                  className={`block h-1 w-full rounded-full ${index === stepIndex ? 'bg-navy-500' : index < stepIndex ? 'bg-white' : 'bg-white/20'}`}
                />
              </li>
            );
          })}
        </ol>

        <ol className="mt-12 hidden lg:block">
          {items.map((item, index) => {
            const currentStep = index === stepIndex;
            const done = index < stepIndex;
            return (
              <li key={item.id} className="border-t border-white/10">
                <button
                  type="button"
                  onClick={() => index <= stepIndex && onSelect(index)}
                  aria-current={currentStep ? 'step' : undefined}
                  className="flex w-full items-baseline gap-4 py-3.5 text-left"
                >
                  <span className={`w-7 shrink-0 text-[11px] font-medium tabular-nums tracking-[0.16em] ${currentStep ? 'text-navy-500' : done ? 'text-white' : 'text-white/30'}`}>
                    {pad(index)}
                  </span>
                  <span className={`text-sm tracking-tight ${currentStep ? 'font-semibold text-white' : done ? 'text-silver-200' : 'text-white/35'}`}>
                    {item.label}
                  </span>
                  {currentStep && <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 shrink-0 self-center rounded-full bg-navy-500" />}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {subtitle && (
        <p className="mt-10 hidden max-w-[16rem] text-sm leading-relaxed text-silver-300 lg:block">{subtitle}</p>
      )}
    </nav>
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
