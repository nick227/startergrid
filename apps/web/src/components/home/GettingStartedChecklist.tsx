import { useEffect, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { fetchDealershipProfile, fetchPublishStatus, fetchPublishHistory } from '@/lib/api/sdk.ts';
import type { DealershipProfile, PublishStatusResponse } from '@/lib/types.ts';
import { hasOptionalChannelConfigured } from '@/components/dealers/DealershipProfilePanel.tsx';
import { SectionCard } from '@/components/operator';

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

function buildSteps(nav: OperatorNavHandlers, profile: DealershipProfile, status: PublishStatusResponse, hasPublished: boolean): Step[] {
  return [
    {
      key: 'profile',
      label: 'Complete your dealership profile',
      done: profile.publishingWarnings.every(w => w.severity !== 'critical'),
      onGo: nav.goToSettings,
      ctaLabel: 'Go to Settings',
    },
    {
      key: 'channels',
      label: 'Set up lead notifications',
      done: hasOptionalChannelConfigured(profile),
      onGo: nav.goToSettings,
      ctaLabel: 'Go to Settings',
    },
    {
      key: 'platform',
      label: 'Connect a sales channel',
      done: status.platforms.some(platformIsConnected),
      onGo: nav.goToPlatforms,
      ctaLabel: 'Go to Platforms',
    },
    {
      key: 'vehicle',
      label: 'Add your first vehicle',
      done: status.vehicles.total > 0,
      onGo: () => nav.goToInventory(),
      ctaLabel: 'Go to Inventory',
    },
    {
      key: 'publish',
      label: 'Publish your first listing',
      done: hasPublished,
      onGo: () => nav.goToInventory(),
      ctaLabel: 'Go to Inventory',
    },
  ];
}

/**
 * Proactive setup guidance for the dealer Home page. Unlike the InfoButton/doc-reader
 * system (pull: user must know to click "i"), this pushes a concrete next step until
 * the dealer's real account state shows every step is done — then it dismisses itself.
 */
export function GettingStartedChecklist({ dealerId, nav }: Props) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY_PREFIX + dealerId) === '1');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchDealershipProfile(dealerId),
      fetchPublishStatus(dealerId),
      fetchPublishHistory(dealerId, { limit: 1 }),
    ])
      .then(([profile, status, history]) => {
        if (!active) return;
        setSteps(buildSteps(nav, profile, status, history.events.length > 0));
      })
      .catch(() => {
        // Setup guidance is a nice-to-have, not a load-bearing surface — fail silently
        // rather than showing an error banner above the rest of a working Home page.
      });
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

  return (
    <div className="mb-6">
      <SectionCard
        title="Getting started"
        subtitle={`${doneCount} of ${steps.length} steps complete`}
        action={
          <button type="button" onClick={dismiss} className="text-xs text-ink-faint hover:text-ink-muted underline underline-offset-2">
            Hide
          </button>
        }
      >
        <ul className="space-y-2.5">
          {steps.map(step => (
            <li key={step.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-sm">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  step.done ? 'bg-status-success-bg text-status-success-text' : 'bg-silver-100 text-ink-faint border border-silver-300'
                }`}>
                  {step.done ? '✓' : ''}
                </span>
                <span className={step.done ? 'text-ink-muted line-through' : 'text-ink-heading font-medium'}>{step.label}</span>
              </span>
              {!step.done && (
                <button type="button" onClick={step.onGo} className="shrink-0 text-xs font-semibold text-navy-600 hover:text-navy-800">
                  {step.ctaLabel} →
                </button>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
