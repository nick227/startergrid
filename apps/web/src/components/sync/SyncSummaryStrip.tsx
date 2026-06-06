import type { SyncReadiness } from '@/lib/syncPresentation.ts';
import type { AutoSyncStatus } from '@/lib/types.ts';
import { InfoLabel } from '@/components/docs';
import { formatBenchmarkFreshness } from '@/lib/performanceFreshness.ts';

export type SyncMovementContext = {
  computedAt: string | null;
  fastCount: number;
  slowCount: number;
  staleCount: number;
  lowDataCount: number;
  benchmarkedCount: number;
  staleStocks: string[];
};

type Props = {
  readiness: SyncReadiness;
  movement?: SyncMovementContext | null;
  autoSync?: AutoSyncStatus | null;
  onReviewInventory?: () => void;
  onOpenInsights?: () => void;
};

type Tile = {
  label: string;
  docId: string;
  value: number;
  hint: string;
  tone: string;
};

export function SyncSummaryStrip({ readiness, movement, autoSync, onReviewInventory, onOpenInsights }: Props) {
  const tiles: Tile[] = [
    {
      label: 'Cars ready',
      docId: 'inventory/inventory-readiness',
      value: readiness.carsReady,
      hint: readiness.carsWarning > 0 ? `${readiness.carsWarning} with warnings` : 'to sync',
      tone: 'text-status-success-text bg-status-success-bg border-status-success-border',
    },
    {
      label: 'Cars blocked',
      docId: 'inventory/inventory-readiness',
      value: readiness.carsBlocked,
      hint: readiness.carsBlocked > 0 ? 'fix in inventory' : 'none',
      tone: readiness.carsBlocked > 0
        ? 'text-status-error-text bg-status-error-bg border-status-error-border'
        : 'text-ink-muted bg-surface-card border-silver-200',
    },
    {
      label: 'Platforms ready',
      docId: 'processes/platform-readiness',
      value: readiness.platformsWillSync + readiness.platformsLive,
      hint: `${readiness.platformsLive} already live`,
      tone: 'text-status-info-text bg-status-info-bg border-status-info-border',
    },
    {
      label: 'Platforms blocked',
      docId: 'platforms/account-states',
      value: readiness.platformsBlocked + readiness.platformsNeedYou,
      hint: readiness.platformsNeedYou > 0 ? `${readiness.platformsNeedYou} pending` : 'need attention',
      tone:
        readiness.platformsBlocked + readiness.platformsNeedYou > 0
          ? 'text-status-warning-text bg-status-warning-bg border-status-warning-border'
          : 'text-ink-muted bg-surface-card border-silver-200',
    },
  ];

  const showMovement = movement?.computedAt != null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(t => (
          <div key={t.label} className={`rounded-xl border px-4 py-4 ${t.tone}`}>
            <div className="text-2xl font-bold tabular-nums leading-none">{t.value}</div>
            <div className="text-xs font-semibold mt-1.5">
              <InfoLabel term={t.label} docId={t.docId} />
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">{t.hint}</div>
          </div>
        ))}
      </div>

      {showMovement && movement && (
        <p className="text-xs text-ink-muted px-1">
          <span className="font-medium text-ink-body">Movement vs similar stock · </span>
          {[
            movement.fastCount > 0 && `${movement.fastCount} fast`,
            movement.slowCount > 0 && `${movement.slowCount} slow`,
            movement.staleCount > 0 && `${movement.staleCount} stale`,
            movement.lowDataCount > 0 && `${movement.lowDataCount} low data`,
          ].filter(Boolean).join(' · ')}
          {movement.staleStocks.length > 0 && (
            <> — expand {movement.staleStocks.join(', ')} in inventory</>
          )}
          {onReviewInventory && (movement.staleCount > 0 || movement.slowCount > 0) && (
            <>
              {' '}
              <button
                type="button"
                onClick={onReviewInventory}
                className="font-semibold text-orange-600 hover:underline"
              >
                Open inventory
              </button>
            </>
          )}
          {onOpenInsights && (
            <>
              {' · '}
              <button
                type="button"
                onClick={onOpenInsights}
                className="font-semibold text-navy-600 hover:text-navy-800 hover:underline"
              >
                Full summary on Insights
              </button>
            </>
          )}
          <span className="block text-[10px] text-ink-faint mt-0.5">
            {formatBenchmarkFreshness(movement.computedAt, autoSync ?? undefined)}
          </span>
        </p>
      )}
    </div>
  );
}
