import type { AutopilotView } from '@/lib/autopilotStatus.ts';
import { GuidanceNote } from './GuidanceNote.tsx';

const DOT: Record<AutopilotView['tone'], string> = {
  on: 'bg-status-success-text',
  paused: 'bg-status-warning-text',
  off: 'bg-silver-400',
};

type Props = {
  view: AutopilotView;
  saving?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  extraAction?: React.ReactNode;
};

export function AutopilotStatusCard({ view, saving, onPause, onResume, extraAction }: Props) {
  return (
    <section className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${DOT[view.tone]}`} aria-hidden="true" />
            <h2 className="text-base font-semibold text-ink-heading">Autopilot {view.label}</h2>
          </div>
          <p className="text-sm text-ink-heading">{view.summary}</p>
          <GuidanceNote>{view.guidance}</GuidanceNote>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {view.canPause && onPause && (
            <button type="button" onClick={onPause} disabled={saving} className="btn-secondary-operator text-xs">
              Pause Autopilot
            </button>
          )}
          {view.canResume && onResume && (
            <button type="button" onClick={onResume} disabled={saving} className="btn-primary-operator text-xs">
              Resume Autopilot
            </button>
          )}
          {extraAction}
        </div>
      </div>
    </section>
  );
}
