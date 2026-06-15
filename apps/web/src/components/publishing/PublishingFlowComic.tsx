import { useCallback, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

type Variant = 'operator' | 'admin-system';

type Step = {
  id: string;
  emoji: string;
  title: string;
  blurb: string;
  tab: string;
  tone: string;
  onClick?: () => void;
};

const STORAGE_PREFIX = 'ads-portal:publishing-guide:v1:';

function storageKey(variant: Variant) {
  return `${STORAGE_PREFIX}${variant}`;
}

function readDismissed(variant: Variant): boolean {
  try {
    return localStorage.getItem(storageKey(variant)) === '1';
  } catch {
    return false;
  }
}

function StepCard({ step, onAction }: { step: Step; onAction?: () => void }) {
  const inner = (
    <>
      <span className="text-2xl leading-none mb-1.5 select-none" aria-hidden>
        {step.emoji}
      </span>
      <span className="text-[10px] font-black uppercase tracking-widest text-ink-faint/80 mb-0.5">
        Step {step.id}
      </span>
      <span className="text-xs font-bold text-ink-heading leading-snug">{step.title}</span>
      <span className="mt-1 text-[10px] text-ink-muted leading-snug line-clamp-3">{step.blurb}</span>
      {onAction ? (
        <span className="mt-2 text-[10px] font-bold text-navy-600 group-hover:text-navy-800">
          {step.tab} →
        </span>
      ) : (
        <span className="mt-2 text-[10px] font-semibold text-ink-faint">{step.tab}</span>
      )}
    </>
  );

  const className = `group flex flex-col items-center text-center min-w-[7.5rem] max-w-[9.5rem] flex-1 rounded-2xl border-2 border-white/80 shadow-sm px-3 py-3 ${step.tone} ${
    onAction ? 'transition-transform hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40' : ''
  }`;

  if (!onAction) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <button type="button" onClick={onAction} className={className}>
      {inner}
    </button>
  );
}

function FlowArrow() {
  return (
    <div className="hidden sm:flex items-center justify-center shrink-0 px-0.5 text-ink-faint/50" aria-hidden>
      <svg width="28" height="20" viewBox="0 0 28 20" fill="none" className="opacity-70">
        <path
          d="M2 10h20m0 0-6-6m6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3 3"
        />
      </svg>
    </div>
  );
}

function operatorSteps(nav: OperatorNavHandlers): Step[] {
  return [
    {
      id: '1',
      emoji: '🔌',
      title: 'Connect channels',
      blurb: 'Link Cars.com, Meta, your storefront — wherever listings should go.',
      tab: 'Platforms',
      tone: 'bg-violet-50/90',
      onClick: () => nav.goToPlatforms(),
    },
    {
      id: '2',
      emoji: '📦',
      title: 'Ready inventory',
      blurb: 'Mark items ready and choose which channels each one uses.',
      tab: 'Inventory',
      tone: 'bg-amber-50/90',
      onClick: () => nav.goToInventory(),
    },
    {
      id: '3',
      emoji: '🚀',
      title: 'Run the queue',
      blurb: 'Approve, schedule, publish now, or hold — this is mission control.',
      tab: 'Queue',
      tone: 'bg-sky-50/90',
      onClick: () => nav.goToQueue(),
    },
    {
      id: '4',
      emoji: '📜',
      title: 'Check history',
      blurb: 'See what already went out and when it landed.',
      tab: 'History',
      tone: 'bg-emerald-50/90',
      onClick: () => nav.goToHistory(),
    },
    {
      id: '5',
      emoji: '📊',
      title: 'Read reports',
      blurb: 'Did it work? Spot slow channels and stuck listings.',
      tab: 'Reports',
      tone: 'bg-rose-50/90',
      onClick: () => nav.goToReports(),
    },
  ];
}

function adminSystemSteps(): Step[] {
  return [
    {
      id: '1',
      emoji: '🏢',
      title: 'Pick a dealer',
      blurb: 'Open the dealership you are helping — everything else is per dealer.',
      tab: 'Dealerships',
      tone: 'bg-violet-50/90',
      onClick: () => { window.location.hash = '#/admin/dealers'; },
    },
    {
      id: '2',
      emoji: '🔌',
      title: 'Connect platforms',
      blurb: 'Inside that dealer: OAuth, credentials, partner signup.',
      tab: 'Dealer → Platforms',
      tone: 'bg-amber-50/90',
      onClick: () => { window.location.hash = '#/admin/dealers'; },
    },
    {
      id: '3',
      emoji: '🚀',
      title: 'Their queue',
      blurb: 'Approve batches, publish now, or clear holds on their behalf.',
      tab: 'Dealer → Queue',
      tone: 'bg-sky-50/90',
      onClick: () => { window.location.hash = '#/admin/dealers'; },
    },
    {
      id: '4',
      emoji: '🛠️',
      title: 'Clear blockers',
      blurb: 'System-wide stuck items, failed syncs, and credential issues.',
      tab: 'Blockers',
      tone: 'bg-red-50/90',
      onClick: () => { window.location.hash = '#/admin/triage'; },
    },
    {
      id: '5',
      emoji: '📡',
      title: 'Watch health',
      blurb: 'Queue snapshot below — retry anything red before dealers notice.',
      tab: 'This page',
      tone: 'bg-emerald-50/90',
    },
  ];
}

type Props = {
  variant: Variant;
  nav?: OperatorNavHandlers;
};

export function PublishingFlowComic({ variant, nav }: Props) {
  const [dismissed, setDismissed] = useState(() => readDismissed(variant));

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey(variant), '1');
    } catch {
      /* ignore */
    }
  }, [variant]);

  if (dismissed) return null;

  const steps =
    variant === 'admin-system'
      ? adminSystemSteps()
      : nav
        ? operatorSteps(nav)
        : [];

  if (!steps.length) return null;

  const headline =
    variant === 'admin-system'
      ? 'How to help dealers publish'
      : 'How publishing works here';

  const subline =
    variant === 'admin-system'
      ? 'Pick a dealer, then walk the same five-step path they use — plus system triage when things stall.'
      : 'Five stops. Connect → stock → launch → log → learn. Tap a step to jump there.';

  return (
    <section
      className="relative mb-6 overflow-hidden rounded-2xl border-2 border-dashed border-navy-300/40 bg-gradient-to-br from-orange-50/50 via-white to-sky-50/40 shadow-sm"
      aria-label={headline}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-200/30 blur-2xl pointer-events-none" />
      <div className="absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-sky-200/30 blur-2xl pointer-events-none" />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600/90 mb-1">
              <span aria-hidden>✨</span> Quick start comic
            </p>
            <h2 className="text-base sm:text-lg font-bold text-ink-heading leading-tight">{headline}</h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">{subline}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 text-[11px] font-semibold text-ink-faint hover:text-ink-muted px-2 py-1 rounded-md hover:bg-white/60 transition-colors"
            aria-label="Dismiss publishing guide"
          >
            Got it ✕
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-stretch gap-3 sm:gap-1">
          {steps.map((step, index) => (
            <div key={step.id} className="flex sm:contents items-center gap-2">
              <StepCard
                step={step}
                onAction={step.onClick}
              />
              {index < steps.length - 1 && (
                <>
                  <FlowArrow />
                  <div className="sm:hidden flex justify-center text-ink-faint/40 text-lg leading-none py-0.5" aria-hidden>
                    ↓
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-ink-faint text-center sm:text-left italic">
          {variant === 'admin-system'
            ? 'Operators live in Queue day-to-day — you jump in when blockers or approvals need a human.'
            : 'Nothing posts until inventory is ready and the queue says go.'}
        </p>
      </div>
    </section>
  );
}
