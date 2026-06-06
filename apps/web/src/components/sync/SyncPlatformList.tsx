import type { PlatformPublishResult, PlatformPerformanceItem } from '@/lib/types.ts';
import {
  friendlyPlatformDetail,
  platformOutcomeMeta,
  sortPlatformsForSync,
} from '@/lib/syncPresentation.ts';
import { formatPlatformAssistHint, formatPlatformExposureLine, formatChannelMetricsDisplay } from '@/lib/movementBenchmark.ts';
import { SectionCard } from '@/components/operator';

type Props = {
  platforms: PlatformPublishResult[];
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
  onFixAccounts?: () => void;
};

export function SyncPlatformList({ platforms, platformPerfBySlug, onFixAccounts }: Props) {
  const sorted = sortPlatformsForSync(platforms);
  const pass = sorted.filter(p => {
    const o = platformSyncOutcomeQuick(p.state);
    return o === 'live' || o === 'ready';
  }).length;
  const fail = sorted.length - pass;

  return (
    <SectionCard
      title="Platforms"
      subtitle={`${pass} ready · ${fail} need attention`}
      action={
        fail > 0 && onFixAccounts ? (
          <button
            type="button"
            onClick={onFixAccounts}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Fix accounts →
          </button>
        ) : undefined
      }
      noPadding
    >
      <ul className="divide-y divide-slate-50">
        {sorted.map(p => (
          <SyncPlatformRow
            key={p.platformSlug}
            platform={p}
            perf={platformPerfBySlug?.get(p.platformSlug)}
            onFixAccounts={onFixAccounts}
          />
        ))}
      </ul>
    </SectionCard>
  );
}

function platformSyncOutcomeQuick(state: string): 'live' | 'ready' | 'other' {
  if (state === 'Active') return 'live';
  if (state === 'Ready' || state === 'Scheduled') return 'ready';
  return 'other';
}

function SyncPlatformRow({
  platform: p,
  perf,
  onFixAccounts,
}: {
  platform: PlatformPublishResult;
  perf?: PlatformPerformanceItem;
  onFixAccounts?: () => void;
}) {
  const meta = platformOutcomeMeta(p);
  const detail = friendlyPlatformDetail(p);
  const exposureLine = perf ? formatPlatformExposureLine(perf) : null;
  const valueHint = perf ? formatPlatformAssistHint(perf) : null;
  const channelFootnote = perf
    ? formatChannelMetricsDisplay(perf.channelMetrics).secondary
    : null;
  const showChannelFootnote =
    channelFootnote != null &&
    channelFootnote.startsWith('Mixed measurement');
  const showAccounts =
    onFixAccounts &&
    (p.accountState === 'BLOCKED' ||
      p.accountState === 'SUSPENDED' ||
      p.accountState === 'ACCOUNT_NEEDED' ||
      p.accountState === 'CREDENTIALS_NEEDED' ||
      p.accountState === 'PARTNER_REQUIRED');

  return (
    <li
      className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${
        meta.outcome === 'blocked' || meta.outcome === 'waiting' ? 'bg-red-50/30' : ''
      }`}
    >
      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.pill}`}
          >
            {meta.label}
          </span>
          <span className="text-sm font-semibold text-slate-900 truncate">{p.platformName}</span>
        </div>
        {exposureLine && (
          <p className="text-[11px] text-slate-500 pl-0.5 truncate">{exposureLine}</p>
        )}
        {valueHint && (
          <p className="text-[11px] text-slate-400 pl-0.5 truncate">{valueHint}</p>
        )}
        {showChannelFootnote && (
          <p className="text-[10px] text-slate-400 pl-0.5 truncate">{channelFootnote}</p>
        )}
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        {detail && <span className="text-xs text-slate-500 truncate max-w-xs">{detail}</span>}
        {showAccounts && (
          <button
            type="button"
            onClick={onFixAccounts}
            className="text-xs font-bold text-red-700 whitespace-nowrap"
          >
            Fix →
          </button>
        )}
      </div>
    </li>
  );
}
