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
    <div className="flex items-center gap-2 text-xs text-slate-400">
      {STEPS.map((s, i) => (
        <span key={s.id} className="flex items-center gap-2">
          {i > 0 && <span className="text-slate-600">→</span>}
          <span
            className={`flex items-center gap-1.5 ${
              s.step <= activeStep ? 'text-slate-200' : 'opacity-50'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                s.id === active
                  ? 'bg-emerald-500 text-white'
                  : s.step < activeStep
                    ? 'bg-slate-600 text-slate-200'
                    : 'bg-slate-700 text-slate-400'
              }`}
            >
              {s.step}
            </span>
            <span className="hidden sm:inline">
              <span className="font-medium text-slate-300">{s.label}</span>
              <span className="text-slate-500 ml-1">{s.hint}</span>
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
