import type { SyncReadiness } from '@/lib/syncPresentation.ts';
import { InfoLabel } from '@/components/docs';

type Props = {
  readiness: SyncReadiness;
  dealerName: string;
  onFixInventory?: () => void;
  onFixAccounts?: () => void;
};

export function SyncHero({ readiness, dealerName, onFixInventory, onFixAccounts }: Props) {
  const busy = readiness.autoSyncPhase === 'running' || readiness.autoSyncPhase === 'scheduled';
  const failed = readiness.autoSyncPhase === 'failed';

  const tone = failed
    ? 'from-red-700 to-red-900'
    : busy
      ? 'from-navy-700 to-navy-500'
      : readiness.carsBlocked > 0
        ? 'from-orange-600 to-orange-500'
        : 'from-navy-900 to-navy-700';

  const fix =
    readiness.blocker?.fixTarget === 'inventory'
      ? onFixInventory
      : readiness.blocker?.fixTarget === 'accounts'
        ? onFixAccounts
        : undefined;

  return (
    <section
      className={`rounded-xl bg-gradient-to-br ${tone} text-white shadow-elevation-3 overflow-hidden`}
    >
      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">{dealerName}</p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wide">
            {busy ? (
              <InfoLabel term="Updating" docId="processes/sync-status" inverted termClassName="text-white" />
            ) : failed ? (
              <InfoLabel term="Needs fix" docId="processes/sync-status" inverted termClassName="text-white" />
            ) : (
              <InfoLabel term="Auto-Sync" docId="processes/auto-sync" inverted termClassName="text-white" />
            )}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{readiness.headline}</h1>
        <p className="text-white/90 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          {readiness.subline}
        </p>
        {readiness.autoSyncLine && (
          <p className="text-white/70 text-xs mt-3">{readiness.autoSyncLine}</p>
        )}

        {readiness.blocker && fix && (
          <div className="mt-6">
            <button
              type="button"
              onClick={fix}
              className="btn-primary-operator !bg-white !text-navy-900 hover:!bg-silver-100 !px-5 !py-3 !text-sm !rounded-md"
            >
              {readiness.blocker.fixLabel} →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
