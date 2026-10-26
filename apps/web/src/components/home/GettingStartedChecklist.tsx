import { useEffect, useState } from 'react';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { fetchDealershipProfile, fetchPublishStatus } from '@/lib/api/sdk.ts';
import type { DealershipProfile, PublishStatusResponse } from '@/lib/types.ts';
import { platformLooksConnected } from '@/lib/pagePrimaryState.ts';

type Props = {
  dealerId: string;
  nav: OperatorNavHandlers;
  profile?: DealershipProfile | null;
  status?: PublishStatusResponse | null;
};

type SetupStep = {
  key: string;
  label: string;
  done: boolean;
  onGo: () => void;
  ctaLabel: string;
};

const DISMISS_KEY_PREFIX = 'getting-started-dismissed:';

function buildSetupSteps(nav: OperatorNavHandlers, profile: DealershipProfile, status: PublishStatusResponse): SetupStep[] {
  return [
    {
      key: 'vehicle',
      label: 'Add vehicles to your lot',
      done: status.vehicles.total > 0,
      onGo: () => nav.goToInventory(),
      ctaLabel: 'Add vehicles',
    },
    {
      key: 'ready',
      label: 'Add a price and photos so a vehicle can be listed',
      done: status.vehicles.ready > 0,
      onGo: () => nav.goToInventory(),
      ctaLabel: 'Review vehicles',
    },
    {
      key: 'channels',
      label: 'Connect a destination where shoppers look',
      done: status.platforms.some(platformLooksConnected),
      onGo: nav.goToPlatforms,
      ctaLabel: 'Connect a destination',
    },
    {
      key: 'team',
      label: 'Set primary contact and invite your team',
      done: profile.publishingWarnings.every(w => w.field !== 'primaryContactEmail'),
      onGo: nav.goToSettings,
      ctaLabel: 'Invite team',
    },
  ];
}

/**
 * First-time dealership orientation.
 * Explains how StarterGrid works in plain language and distinguishes internal
 * lot/account setup from ongoing external distribution outcomes.
 */
export function GettingStartedChecklist({ dealerId, nav, profile: profileProp, status: statusProp }: Props) {
  const [loadedProfile, setLoadedProfile] = useState<DealershipProfile | null>(profileProp ?? null);
  const [loadedStatus, setLoadedStatus] = useState<PublishStatusResponse | null>(statusProp ?? null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY_PREFIX + dealerId) === '1');
  const profile = profileProp ?? loadedProfile;
  const status = statusProp ?? loadedStatus;

  useEffect(() => {
    if (profileProp && statusProp) return;
    let active = true;
    Promise.all([
      fetchDealershipProfile(dealerId),
      fetchPublishStatus(dealerId),
    ])
      .then(([prof, stat]) => {
        if (!active) return;
        setLoadedProfile(prof);
        setLoadedStatus(stat);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [dealerId, profileProp, statusProp]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY_PREFIX + dealerId, '1');
    setDismissed(true);
  };

  if (dismissed || !profile || !status) return null;

  const steps = buildSetupSteps(nav, profile, status);
  const allSetupDone = steps.every(s => s.done);
  const connectedCount = status.platforms.filter(platformLooksConnected).length;
  const autopilotOn = (profile.autopilotPreference ?? 'OFF') === 'ON';

  // If both setup steps and autopilot distribution are live, auto-dismiss.
  if (allSetupDone && autopilotOn && connectedCount > 0) {
    localStorage.setItem(DISMISS_KEY_PREFIX + dealerId, '1');
    return null;
  }

  const doneCount = steps.filter(s => s.done).length;
  const progressPercent = Math.round((doneCount / steps.length) * 100);
  const firstIncompleteStep = steps.find(s => !s.done);

  return (
    <div className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white space-y-4">
      {/* Header & User-Approved Opening Message */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">🚀</span>
            <h2 className="text-sm font-bold text-ink-heading">Getting started with StarterGrid</h2>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed max-w-2xl">
            Add your vehicles once. StarterGrid helps keep your listings updated across connected advertising and sales channels. Buyer inquiries arrive in one place.
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

      {/* Immediate Next Action Prompt */}
      {firstIncompleteStep && (
        <div className="bg-navy-50/70 border border-navy-100 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy-800">Your first action</span>
            <p className="text-xs font-semibold text-ink-heading">{firstIncompleteStep.label}</p>
          </div>
          <button
            type="button"
            onClick={firstIncompleteStep.onGo}
            className="btn-primary-operator text-xs py-1.5 px-3 self-start sm:self-auto shrink-0 shadow-sm"
          >
            {firstIncompleteStep.ctaLabel} →
          </button>
        </div>
      )}

      {/* Part 1: Account & Lot Setup */}
      <div className="space-y-2 pt-2 border-t border-silver-100">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink-heading">Account & Lot Setup</span>
          <span className="text-ink-muted">{doneCount} of {steps.length} completed ({progressPercent}%)</span>
        </div>
        <div className="w-full h-1.5 bg-silver-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-navy-800 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <ul className="space-y-2 pt-1">
          {steps.map(step => (
            <li key={step.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
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
                  className="shrink-0 text-xs font-semibold text-navy-700 hover:text-navy-900"
                >
                  {step.ctaLabel} →
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Part 2: Channel Distribution & Live Outcomes (Distinct from internal setup) */}
      <div className="p-3 bg-surface-page rounded-lg border border-silver-200 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink-heading flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${autopilotOn && connectedCount > 0 ? 'bg-status-success-text' : 'bg-amber-500'}`} />
            Channel Distribution & Listing Outcomes
          </span>
          <span className="text-[11px] text-ink-muted font-medium">
            {status.vehicles.ready} vehicle{status.vehicles.ready === 1 ? '' : 's'} qualified
          </span>
        </div>

        <p className="text-ink-muted leading-relaxed">
          {autopilotOn
            ? connectedCount === 0
              ? 'Autopilot is active, but requires at least one connected channel to deliver catalog feeds.'
              : `Autopilot delivers catalog feeds across ${connectedCount} connected channel${connectedCount === 1 ? '' : 's'}.`
            : 'Autopilot is currently off. Ready vehicles will not be sent to connected channels automatically until Autopilot is turned on.'}
        </p>

        <div className="pt-1.5 border-t border-silver-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-ink-muted">
          <span>
            <strong className="text-ink-heading">Connected ≠ Live:</strong> Advertising channels review and verify listings after feed delivery.
          </span>
          <button
            type="button"
            onClick={nav.goToPlatforms}
            className="text-navy-700 hover:text-navy-900 font-semibold underline shrink-0"
          >
            Review channels →
          </button>
        </div>
      </div>
    </div>
  );
}
