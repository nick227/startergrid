import { useState } from 'react';
import { runPrepare } from '../lib/api.ts';
import type { NextRecommendedAction, PublishStateSummary } from '../lib/types.ts';
import { NEXT_ACTION_REGISTRY, TONE_SURFACE } from '../lib/statusRegistry.ts';
import { InlineCallout } from './operator/InlineCallout.tsx';

type Props = {
  action: NextRecommendedAction;
  summary: PublishStateSummary;
  vehicles: { total: number; ready: number; warning: number; blocked: number };
  dealerId?: string;
  onRefresh?: () => void;
  onGoInventory?: () => void;
  onGoAccounts?: () => void;
};

export default function ActionBanner({
  action,
  summary,
  vehicles,
  dealerId,
  onRefresh,
  onGoInventory,
  onGoAccounts,
}: Props) {
  const meta = NEXT_ACTION_REGISTRY[action];
  const surface = TONE_SURFACE[meta.tone];
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const runScheduler = async () => {
    if (!dealerId || !onRefresh) return;
    setScheduling(true);
    setScheduleError(null);
    try {
      await runPrepare(dealerId, { dryRun: false });
      onRefresh();
    } catch (e: unknown) {
      setScheduleError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setScheduling(false);
    }
  };

  const showScheduler = action === 'run_scheduler' && dealerId && onRefresh;

  return (
    <div
      className={`rounded-2xl border-2 shadow-md ${surface.bg} ${surface.border} overflow-hidden`}
      role="status"
      aria-live="polite"
    >
      <div className="px-6 py-5 sm:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 ${surface.border} border bg-white/60`}
          >
            {meta.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{meta.title}</h2>
              {meta.urgency === 'high' && (
                <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                  Action required
                </span>
              )}
              {meta.urgency === 'medium' && (
                <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                  Operator needed
                </span>
              )}
            </div>
            <p className="text-base text-slate-700 leading-relaxed">{meta.description(summary, vehicles)}</p>
            {meta.hint && <p className="text-sm text-slate-500 mt-2">{meta.hint}</p>}
            {scheduleError && <p className="text-sm text-red-600 mt-2">{scheduleError}</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {meta.inventoryLink && onGoInventory && (
              <button
                type="button"
                onClick={onGoInventory}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Fix inventory →
              </button>
            )}
            {meta.accountsLink && onGoAccounts && (
              <button
                type="button"
                onClick={onGoAccounts}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Manage accounts →
              </button>
            )}
            {showScheduler && (
              <button
                type="button"
                onClick={() => void runScheduler()}
                disabled={scheduling}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {scheduling ? 'Running…' : 'Run scheduler'}
              </button>
            )}
          </div>
        </div>
      </div>

      {(meta.inventoryLink || meta.accountsLink) && (
        <div className="px-6 pb-4 flex flex-wrap gap-2">
          {meta.inventoryLink && onGoInventory && (
            <span className="text-xs text-slate-500">Step 1: Inventory</span>
          )}
          {meta.accountsLink && onGoAccounts && (
            <span className="text-xs text-slate-500">Step 2: Accounts</span>
          )}
          <span className="text-xs text-slate-500">→ then Prepare &amp; Publish</span>
        </div>
      )}
    </div>
  );
}

/** Compact variant for secondary callouts */
export function NextActionCallout(props: Props) {
  const meta = NEXT_ACTION_REGISTRY[props.action];
  return (
    <InlineCallout
      tone={meta.tone}
      title={meta.title}
      icon={meta.icon}
      action={
        props.action === 'fix_blocked_vehicles' && props.onGoInventory ? (
          <button type="button" onClick={props.onGoInventory} className="text-xs font-semibold underline">
            Inventory
          </button>
        ) : props.action === 'resolve_account_requirement' && props.onGoAccounts ? (
          <button type="button" onClick={props.onGoAccounts} className="text-xs font-semibold underline">
            Accounts
          </button>
        ) : undefined
      }
    >
      {meta.description(props.summary, props.vehicles)}
    </InlineCallout>
  );
}
