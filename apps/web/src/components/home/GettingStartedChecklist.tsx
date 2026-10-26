import { useEffect, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { fetchDealershipProfile, fetchPublishStatus } from '@/lib/api/sdk.ts';
import type { DealershipProfile, PublishStatusResponse } from '@/lib/types.ts';
type Props = {
  dealerId: string;
  nav: OperatorNavHandlers;
};

type Step = {
  key: string;
  label: string;
  done: boolean;
  onGo: () => void;
  ctaLabel: string;
};

const DISMISS_KEY_PREFIX = 'getting-started-dismissed:';

function platformIsConnected(platform: PublishStatusResponse['platforms'][number]): boolean {
  return platform.accountState === 'ACTIVE' || platform.state === 'Active' || platform.state === 'Ready' || platform.state === 'Scheduled';
}

function buildSteps(nav: OperatorNavHandlers, profile: DealershipProfile, status: PublishStatusResponse): Step[] {
  return [
    {
      key: 'channels',
      label: 'Connect at least one sales channel (Google, Meta, or partner marketplaces)',
      done: status.platforms.some(platformIsConnected),
      onGo: nav.goToPlatforms,
      ctaLabel: 'Open channels',
    },
    {
      key: 'vehicle',
      label: 'Add or import your vehicle inventory',
      done: status.vehicles.total > 0,
      onGo: () => nav.goToInventory(),
      ctaLabel: 'Open vehicles',
    },
    {
      key: 'ready',
      label: 'Make vehicles ready to list (fix prices and attach photos)',
      done: status.vehicles.ready > 0,
      onGo: () => nav.goToInventory(),
      ctaLabel: 'Review lot',
    },
    {
      key: 'autopilot',
      label: 'Activate Autopilot (automated syndication & safeguard guardrails)',
      done: (profile.autopilotPreference ?? 'OFF') === 'ON',
      onGo: nav.goToHome,
      ctaLabel: 'Review Autopilot',
    },
    {
      key: 'team',
      label: 'Invite your dealership sales and management team',
      done: profile.publishingWarnings.every(w => w.field !== 'primaryContactEmail'),
      onGo: nav.goToSettings,
      ctaLabel: 'Invite team',
    },
  ];
}

/**
 * Proactive setup guidance for the dealer Home page. Explains what StarterGrid does
 * and gives new dealership employees a crystal-clear path to first publication and lead handling.
 */
export function GettingStartedChecklist({ dealerId, nav }: Props) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY_PREFIX + dealerId) === '1');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchDealershipProfile(dealerId),
      fetchPublishStatus(dealerId),
    ])
      .then(([profile, status]) => {
        if (!active) return;
        setSteps(buildSteps(nav, profile, status));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [dealerId, nav]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY_PREFIX + dealerId, '1');
    setDismissed(true);
  };

  if (dismissed || !steps) return null;

  const allDone = steps.every(s => s.done);
  if (allDone) {
    localStorage.setItem(DISMISS_KEY_PREFIX + dealerId, '1');
    return null;
  }

  const doneCount = steps.filter(s => s.done).length;
  const progressPercent = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white space-y-4">
      {/* Platform Value Proposition & Orientation */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🚀</span>
            <h2 className="text-sm font-bold text-ink-heading">Getting started with StarterGrid</h2>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed max-w-2xl">
            StarterGrid centralizes your lot inventory, automatically syndicates eligible listings to connected advertising channels with pricing safeguards, and routes incoming buyer inquiries to your team.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-ink-faint hover:text-ink-muted underline underline-offset-2 shrink-0"
        >
          Hide checklist
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink-heading">Setup Progress</span>
          <span className="text-ink-muted">{doneCount} of {steps.length} steps completed ({progressPercent}%)</span>
        </div>
        <div className="w-full h-2 bg-silver-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-navy-800 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <ul className="space-y-2.5 pt-2 border-t border-silver-100">
        {steps.map(step => (
          <li key={step.key} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
            <span className="flex items-center gap-2.5">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                step.done ? 'bg-status-success-bg text-status-success-text' : 'bg-silver-100 text-ink-faint border border-silver-300'
              }`}>
                {step.done ? '✓' : ''}
              </span>
              <span className={step.done ? 'text-ink-muted line-through' : 'text-ink-heading font-medium'}>
                {step.label}
              </span>
            </span>
            {!step.done && (
              <button
                type="button"
                onClick={step.onGo}
                className="shrink-0 text-xs font-semibold text-navy-700 hover:text-navy-900 font-sans"
              >
                {step.ctaLabel} →
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
