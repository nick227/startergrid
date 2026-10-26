import { OwnershipLine } from './OwnershipLine.tsx';
import type { PageExperience } from '@/lib/pagePrimaryState.ts';

type Props = {
  kind: PageExperience;
  title: string;
  why: string;
  next?: string;
  ownerKind?: 'YOU' | 'OUR_TEAM';
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

const FRAME: Record<PageExperience, string> = {
  empty: 'border-navy-200 bg-navy-50/50',
  setup: 'border-silver-200 bg-white',
  running: 'border-silver-200 bg-white',
  attention: 'border-amber-300 bg-amber-50/60',
};

/** Purpose-built page hero. Kind changes the frame, not just a number on the same layout. */
export function PagePrimaryState({
  kind,
  title,
  why,
  next,
  ownerKind,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: Props) {
  const compact = kind === 'running';

  return (
    <section className={`rounded-xl border p-5 ${compact ? 'sm:p-4' : 'sm:p-6'} ${FRAME[kind]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
        {kind === 'empty' ? 'Start here' : kind === 'setup' ? 'In progress' : kind === 'attention' ? 'Needs a fix' : 'Working'}
      </p>
      <h2 className={`mt-1 font-bold text-ink-heading ${compact ? 'text-sm' : 'text-lg'}`}>{title}</h2>
      <p className={`mt-1.5 text-ink-body leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>{why}</p>
      {next && (
        <div className="mt-3">
          {ownerKind ? <OwnershipLine action={next} ownerKind={ownerKind} due="today" /> : (
            <p className="text-xs text-ink-muted">{next}</p>
          )}
        </div>
      )}
      {(actionLabel && onAction) || (secondaryLabel && onSecondary) ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {actionLabel && onAction && (
            <button type="button" onClick={onAction} className="btn-primary-operator text-sm">
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button type="button" onClick={onSecondary} className="text-sm font-semibold text-navy-700 hover:underline">
              {secondaryLabel}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
