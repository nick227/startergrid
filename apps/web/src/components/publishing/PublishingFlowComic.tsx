import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

type Variant = 'operator' | 'admin-system';

type Step = {
  emoji: string;
  title: string;
  body: string;
  linkLabel: string;
  onNavigate?: () => void;
};

function StepCard({ step }: { step: Step }) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-border-subtle bg-white p-5">
      <span className="text-3xl leading-none mb-3 select-none" aria-hidden>
        {step.emoji}
      </span>
      <h3 className="text-base font-semibold text-ink-heading leading-snug mb-2">
        {step.title}
      </h3>
      <p className="text-[15px] text-ink-muted leading-relaxed flex-1">
        {step.body}
      </p>
      {step.onNavigate ? (
        <button
          type="button"
          onClick={step.onNavigate}
          className="mt-4 inline-flex text-[15px] font-semibold text-navy-600 hover:text-navy-800 focus:outline-none focus-visible:underline"
        >
          {step.linkLabel} →
        </button>
      ) : (
        <span className="mt-4 text-[15px] font-medium text-ink-faint">{step.linkLabel}</span>
      )}
    </article>
  );
}

function operatorSteps(nav: OperatorNavHandlers): Step[] {
  return [
    {
      emoji: '🔌',
      title: 'Connect sales channels',
      body: 'Link Cars.com, Meta, your storefront, and other destinations. A channel must be connected before any listing can post there.',
      linkLabel: 'Platforms',
      onNavigate: () => nav.goToPlatforms(),
    },
    {
      emoji: '📦',
      title: 'Prepare inventory to publish',
      body: 'Enter vehicle details, photos, and price. Mark items ready and choose which channels each one uses. Gaps show up as blocked rows in Queue.',
      linkLabel: 'Inventory',
      onNavigate: () => nav.goToInventory(),
    },
    {
      emoji: '📋',
      title: 'Run the publish queue',
      body: 'Lists what will go out, when, and why. Send times follow each platform’s built-in schedule. You approve, hold, retry, or publish now before anything sends.',
      linkLabel: 'Queue',
      onNavigate: () => nav.goToQueue(),
    },
    {
      emoji: '📜',
      title: 'See what already posted',
      body: 'Timestamped log of sends, updates, removals, and errors. Use it to verify a listing went live after acting in Queue.',
      linkLabel: 'History',
      onNavigate: () => nav.goToHistory(),
    },
    {
      emoji: '💬',
      title: 'Work buyer leads',
      body: 'Inquiries tied to your live listings across channels. Check here after inventory is posting so you can respond while interest is fresh.',
      linkLabel: 'Leads',
      onNavigate: () => nav.goToLeads(),
    },
    {
      emoji: '📊',
      title: 'Track listing performance',
      body: 'Views, lead volume, and errors by channel over time. Weak results usually mean a fix in Inventory or Queue.',
      linkLabel: 'Reports',
      onNavigate: () => nav.goToReports(),
    },
  ];
}

function adminSystemSteps(): Step[] {
  return [
    {
      emoji: '🏢',
      title: 'Open the right dealership',
      body: 'Platforms, inventory, and queue all belong to one dealer. Select them before making changes on their behalf.',
      linkLabel: 'Dealerships',
      onNavigate: () => { window.location.hash = '#/admin/dealers'; },
    },
    {
      emoji: '🔌',
      title: 'Fix their channel connections',
      body: 'Same Platforms screen the dealer uses. Complete OAuth, credentials, or partner signup so inventory can enter Queue.',
      linkLabel: 'Dealer → Platforms',
      onNavigate: () => { window.location.hash = '#/admin/dealers'; },
    },
    {
      emoji: '📋',
      title: 'Clear their publish queue',
      body: 'Approve, hold, or publish now when the dealer is stuck. Row counts on the platform list should match Queue.',
      linkLabel: 'Dealer → Queue',
      onNavigate: () => { window.location.hash = '#/admin/dealers'; },
    },
    {
      emoji: '🛠️',
      title: 'Resolve system blockers',
      body: 'Cross-dealer failures — bad credentials, sync errors, validation stalls — that won’t clear from the dealer Queue alone.',
      linkLabel: 'Blockers',
      onNavigate: () => { window.location.hash = '#/admin/blockers'; },
    },
    {
      emoji: '📡',
      title: 'Watch pipeline health',
      body: 'Queue snapshot and environment signals on this page. Spikes here mean drill into a dealer’s Queue or Blockers.',
      linkLabel: 'This page',
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
      ? 'How publishing works (admin)'
      : 'How publishing works';

  const intro =
    variant === 'admin-system'
      ? 'Dealers connect channels, prepare inventory, and run Queue. You step in per dealer or through Blockers when something system-wide breaks.'
      : 'Connect channels, prepare inventory, run Queue — then use History, Leads, and Reports to confirm results and respond to buyers.';

  return (
    <section className="mb-6 rounded-lg border border-border-subtle bg-white" aria-label={headline}>
      <div className="border-b border-border-subtle px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-ink-heading">{headline}</h2>
        <p className="text-[15px] text-ink-muted mt-1 leading-relaxed">{intro}</p>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-4 sm:p-6">
        {steps.map(step => (
          <li key={step.title} className="min-h-0">
            <StepCard step={step} />
          </li>
        ))}
      </ol>
    </section>
  );
}
