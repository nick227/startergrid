import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

type Variant = 'operator' | 'admin-system';

type Step = {
  id: string;
  emoji: string;
  title: string;
  whatItIs: string;
  whatHappens: string;
  whatYouDo: string;
  tab: string;
  tone: string;
  onClick?: () => void;
};

function StepCard({ step }: { step: Step }) {
  const className = `w-full rounded-xl border border-white/90 shadow-sm ${step.tone} ${
    step.onClick
      ? 'transition-shadow hover:shadow-md focus-within:shadow-md'
      : ''
  }`;

  const content = (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-5">
      <div
        className="shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-white/75 border border-white shadow-sm text-3xl select-none"
        aria-hidden
      >
        {step.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 mb-3">
          <h3 className="text-sm sm:text-base font-bold text-ink-heading leading-snug">
            <span className="text-ink-faint font-semibold tabular-nums mr-1.5">{step.id}.</span>
            {step.title}
          </h3>
          {step.onClick ? (
            <span className="text-xs font-semibold text-navy-600 shrink-0">
              {step.tab} →
            </span>
          ) : (
            <span className="text-xs font-medium text-ink-faint shrink-0">{step.tab}</span>
          )}
        </div>

        <dl className="space-y-2.5 text-xs sm:text-sm text-ink-muted leading-relaxed">
          <div>
            <dt className="font-semibold text-ink-heading mb-0.5">What it is</dt>
            <dd>{step.whatItIs}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-heading mb-0.5">What happens</dt>
            <dd>{step.whatHappens}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-heading mb-0.5">What you do</dt>
            <dd>{step.whatYouDo}</dd>
          </div>
        </dl>
      </div>
    </div>
  );

  if (!step.onClick) {
    return <article className={className}>{content}</article>;
  }

  return (
    <button type="button" onClick={step.onClick} className={`${className} text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40`}>
      {content}
    </button>
  );
}

function operatorSteps(nav: OperatorNavHandlers): Step[] {
  return [
    {
      id: '1',
      emoji: '🔌',
      title: 'Platforms',
      whatItIs:
        'The sales channels where your listings can appear — for example Cars.com, Meta catalog, your storefront, or partner feeds.',
      whatHappens:
        'Each platform has its own connection rules (OAuth, API credentials, partner approval). Until a platform is connected for this dealer, no inventory can be sent there.',
      whatYouDo:
        'Open Platforms to connect accounts, finish partner signup, or repair broken credentials. After connecting, check each platform row for queue counts so you know what work is waiting.',
      tab: 'Open Platforms',
      tone: 'bg-violet-50/90',
      onClick: () => nav.goToPlatforms(),
    },
    {
      id: '2',
      emoji: '📦',
      title: 'Inventory',
      whatItIs:
        'Your stock — vehicles or other products — plus the channel assignments and readiness state for each item.',
      whatHappens:
        'An item must be complete, marked ready, and assigned to a channel before it can enter that channel’s publish queue. Missing photos, price, or required fields keep the item out of the queue or mark it blocked.',
      whatYouDo:
        'Open Inventory to fill in required data, upload media, set readiness, and turn channels on per item. Use the channel matrix on each row to see per-destination queue status and jump to the matching queue filter.',
      tab: 'Open Inventory',
      tone: 'bg-amber-50/90',
      onClick: () => nav.goToInventory(),
    },
    {
      id: '3',
      emoji: '📋',
      title: 'Queue',
      whatItIs:
        'The outbound control center — every listing waiting to post, scheduled to post, held, blocked, or needing approval.',
      whatHappens:
        'Ready inventory enters the queue with a status and, when applicable, a scheduled send time. Posting schedules are set automatically per platform type (immediate send, batch window, manual release, or approval gate). The queue row shows the action, status, scheduled time, and reason. Nothing leaves the dealer until the queue allows it.',
      whatYouDo:
        'Open Queue to approve pending work, put items on hold, release holds, reject bad rows, retry failures, or publish now. This is where you control what goes out and when — check it regularly after inventory or platform changes.',
      tab: 'Open Queue',
      tone: 'bg-sky-50/90',
      onClick: () => nav.goToQueue(),
    },
    {
      id: '4',
      emoji: '📜',
      title: 'History',
      whatItIs:
        'A chronological log of publish events — sends, updates, removals, and errors — after queue actions complete.',
      whatHappens:
        'Each successful or failed submission writes a record with platform, item, timestamp, and outcome. History reflects what already left the system; it does not show upcoming work (that stays in Queue).',
      whatYouDo:
        'Open History to confirm a listing posted, verify timing after you used Publish now or approval, or trace a failure back to a specific item and platform.',
      tab: 'Open History',
      tone: 'bg-emerald-50/90',
      onClick: () => nav.goToHistory(),
    },
    {
      id: '5',
      emoji: '📊',
      title: 'Reports',
      whatItIs:
        'Aggregated views of listing performance and pipeline health across platforms and time ranges.',
      whatHappens:
        'Reports combine history, platform feedback, and inventory state to surface views, leads, errors, stale listings, and channel-level trends.',
      whatYouDo:
        'Open Reports after listings are live to see whether outbound work is performing. Use findings to decide whether to fix data in Inventory, clear blockers in Queue, or adjust channel setup in Platforms.',
      tab: 'Open Reports',
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
      title: 'Select a dealership',
      whatItIs:
        'The dealer context for all publishing work — platforms, inventory, queue, and history are scoped to one dealership at a time.',
      whatHappens:
        'Admin tools can browse many dealers, but connect, queue, and inventory actions apply to whichever dealer you have open. System-wide views aggregate across dealers for triage only.',
      whatYouDo:
        'Open Dealerships and select the dealer you are supporting before changing platforms or queue items on their behalf.',
      tab: 'Open Dealerships',
      tone: 'bg-violet-50/90',
      onClick: () => { window.location.hash = '#/admin/dealers'; },
    },
    {
      id: '2',
      emoji: '🔌',
      title: 'Platforms (per dealer)',
      whatItIs:
        'That dealer’s channel accounts — same Platforms area the operator uses, with connection and credential state.',
      whatHappens:
        'Until a platform is connected for the dealer, their inventory cannot post there. Connection issues surface on the platform row and in queue blocked counts.',
      whatYouDo:
        'From the dealer overview, open Platforms to complete OAuth, enter credentials, or fix partner signup blockers so their inventory can enter the queue.',
      tab: 'Dealer → Platforms',
      tone: 'bg-amber-50/90',
      onClick: () => { window.location.hash = '#/admin/dealers'; },
    },
    {
      id: '3',
      emoji: '📋',
      title: 'Queue (per dealer)',
      whatItIs:
        'The dealer’s outbound pipeline — scheduled sends, approval gates, holds, and blocked rows.',
      whatHappens:
        'Schedules are automatic per platform type. Operators normally run Queue day to day; admins step in for approvals, stuck batches, or publish-now requests the dealer cannot complete.',
      whatYouDo:
        'Open the dealer’s Queue to approve, hold, release, or publish now. Match platform row counts to the Queue tab before closing a support ticket.',
      tab: 'Dealer → Queue',
      tone: 'bg-sky-50/90',
      onClick: () => { window.location.hash = '#/admin/dealers'; },
    },
    {
      id: '4',
      emoji: '🛠️',
      title: 'Blockers',
      whatItIs:
        'Cross-dealer triage for failed syncs, credential failures, validation errors, and other system-level stalls.',
      whatHappens:
        'Blockers aggregate issues that may affect multiple dealers or need admin credentials. They do not replace the dealer Queue — they highlight what needs intervention outside normal operator workflow.',
      whatYouDo:
        'Open Blockers when queue rows stay blocked after the dealer fixes inventory, or when credentials fail across environments. Resolve the root cause, then confirm the dealer’s Queue clears.',
      tab: 'Open Blockers',
      tone: 'bg-red-50/90',
      onClick: () => { window.location.hash = '#/admin/triage'; },
    },
    {
      id: '5',
      emoji: '📡',
      title: 'System health',
      whatItIs:
        'This page’s queue snapshot and environment signals — a high-level view of pipeline activity across dealers.',
      whatHappens:
        'Health metrics reflect current backlog, recent failures, and integration status. They update as dealers act in Queue and as scheduled jobs run.',
      whatYouDo:
        'Review the snapshot here for regressions after deploys or credential changes. Drill into a dealer’s Queue or Blockers when counts stay elevated.',
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
  const steps =
    variant === 'admin-system'
      ? adminSystemSteps()
      : nav
        ? operatorSteps(nav)
        : [];

  if (!steps.length) return null;

  const headline =
    variant === 'admin-system'
      ? 'Publishing workflow for admins'
      : 'Publishing workflow';

  const intro =
    variant === 'admin-system'
      ? 'Publishing is not one switch. Dealers connect channels, prepare inventory, then control outbound work through Queue. History and Reports show what already happened and how it performed. Use the steps below in that order when onboarding or troubleshooting a dealer.'
      : 'Listings do not post on their own. You connect channels in Platforms, prepare stock in Inventory, then control what goes out in Queue. History records completed actions; Reports show results over time. Read each step for what that area is responsible for and when you need it.';

  const scheduleNote =
    'Posting schedules are set per platform type (immediate, batch window, manual, or approval required). Queue shows the scheduled time for each row. To change what happens before send — approve, hold, retry, or publish now — use Queue; schedule rules themselves are managed by the platform configuration.';

  return (
    <section
      className="relative mb-6 overflow-hidden rounded-2xl border border-navy-200/50 bg-gradient-to-br from-orange-50/40 via-white to-sky-50/30 shadow-sm"
      aria-label={headline}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-200/25 blur-2xl pointer-events-none" />
      <div className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-sky-200/25 blur-2xl pointer-events-none" />

      <div className="relative p-4 sm:p-6">
        <header className="mb-5 max-w-4xl">
          <h2 className="text-lg sm:text-xl font-bold text-ink-heading leading-tight">{headline}</h2>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed">{intro}</p>
          {variant === 'operator' && (
            <p className="text-sm text-ink-muted mt-2 leading-relaxed border-l-2 border-sky-300/60 pl-3">
              {scheduleNote}
            </p>
          )}
        </header>

        <ol className="flex flex-col gap-3 sm:gap-4 list-none p-0 m-0">
          {steps.map(step => (
            <li key={step.id}>
              <StepCard step={step} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
