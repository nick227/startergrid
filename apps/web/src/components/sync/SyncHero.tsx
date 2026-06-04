import type { SyncReadiness } from '@/lib/syncPresentation.ts';

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
    ? 'from-red-500 to-rose-600'
    : busy
      ? 'from-sky-500 to-indigo-600'
      : readiness.carsBlocked > 0
        ? 'from-amber-500 to-orange-600'
        : 'from-emerald-500 to-teal-600';

  const fix =
    readiness.blocker?.fixTarget === 'inventory'
      ? onFixInventory
      : readiness.blocker?.fixTarget === 'accounts'
        ? onFixAccounts
        : undefined;

  return (
    <section
      className={`rounded-2xl bg-gradient-to-br ${tone} text-white shadow-xl shadow-slate-900/15 overflow-hidden`}
    >
      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">{dealerName}</p>
          <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wide">
            {busy ? 'Updating' : failed ? 'Needs fix' : 'Auto-sync on'}
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
              className="px-5 py-3 bg-white text-slate-900 text-sm font-bold rounded-xl shadow-md hover:bg-slate-50 transition-colors"
            >
              {readiness.blocker.fixLabel} →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
