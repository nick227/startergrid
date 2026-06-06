import type { OperatorTab } from '../../lib/operatorNav.ts';

const STEPS: Array<{ id: OperatorTab; step: number; label: string; hint: string }> = [
  { id: 'inventory', step: 1, label: 'Inventory', hint: 'Import & clean' },
  { id: 'accounts', step: 2, label: 'Accounts', hint: 'Resolve blockers' },
  { id: 'sync', step: 3, label: 'Sync', hint: 'Push to platforms' },
];

type Props = { active: OperatorTab };

export function WorkflowStrip({ active }: Props) {
  const activeStep = STEPS.find(s => s.id === active)?.step ?? 3;
  return (
    <div className="flex items-center gap-2 text-xs text-ink-faint">
      {STEPS.map((s, i) => (
        <span key={s.id} className="flex items-center gap-2">
          {i > 0 && <span className="text-navy-600">→</span>}
          <span
            className={`flex items-center gap-1.5 ${
              s.step <= activeStep ? 'text-silver-100' : 'opacity-50'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                s.id === active
                  ? 'bg-orange-600 text-white'
                  : s.step < activeStep
                    ? 'bg-navy-700 text-silver-100'
                    : 'bg-navy-800 text-ink-faint ring-1 ring-silver-300/20'
              }`}
            >
              {s.step}
            </span>
            <span className="hidden sm:inline">
              <span className="font-medium text-silver-200">{s.label}</span>
              <span className="text-navy-500 ml-1">{s.hint}</span>
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
