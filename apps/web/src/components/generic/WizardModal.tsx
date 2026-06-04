import type { ReactNode } from 'react';
import { Modal } from '../ui/Modal.tsx';

type StepDef = { label: string };

type Props = {
  title: string;
  steps: StepDef[];
  step: number;
  onClose: () => void;
  onBack?: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary: () => void;
  children: ReactNode;
};

function StepIndicator({ steps, current }: { steps: StepDef[]; current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center
              ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}
            >
              {done ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${active ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{s.label}</span>
            {i < steps.length - 1 && <span className="text-slate-200 mx-1">›</span>}
          </div>
        );
      })}
    </div>
  );
}

export function WizardModal({
  title, steps, step, onClose, onBack,
  primaryLabel, primaryDisabled, primaryLoading, onPrimary,
  children,
}: Props) {
  const isLastStep = step === steps.length - 1;

  return (
    <Modal>
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>
        <StepIndicator steps={steps} current={step} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              disabled={primaryLoading}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-40"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={primaryLoading}
            className="px-4 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onPrimary}
            disabled={primaryDisabled || primaryLoading}
            className={`px-4 py-2 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40
              ${isLastStep ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
