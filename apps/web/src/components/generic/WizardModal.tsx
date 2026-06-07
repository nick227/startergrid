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
              ${done ? 'bg-navy-700 text-white' : active ? 'bg-orange-600 text-white' : 'bg-silver-200 text-ink-faint'}`}
            >
              {done ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${active ? 'text-ink-heading font-medium' : 'text-ink-faint'}`}>{s.label}</span>
            {i < steps.length - 1 && <span className="text-silver-200 mx-1">›</span>}
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
      <div className="px-6 pt-6 pb-4 border-b border-silver-100 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink-heading">{title}</h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink-body text-lg leading-none">✕</button>
        </div>
        <StepIndicator steps={steps} current={step} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

      <div className="px-6 py-4 border-t border-silver-100 flex items-center justify-between shrink-0">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              disabled={primaryLoading}
              className="px-3 py-1.5 text-xs text-ink-body hover:text-ink-heading transition-colors disabled:opacity-40"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={primaryLoading}
            className="px-4 py-1.5 text-xs text-ink-muted hover:text-ink-body transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onPrimary}
            disabled={primaryDisabled || primaryLoading}
            className={`px-4 py-2 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40
              ${isLastStep ? 'bg-orange-600 hover:bg-orange-500' : 'bg-navy-800 hover:bg-navy-700'}`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
