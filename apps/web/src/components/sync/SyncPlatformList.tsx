import type { PlatformPublishResult } from '@/lib/types.ts';
import {
  friendlyPlatformDetail,
  platformOutcomeMeta,
  sortPlatformsForSync,
} from '@/lib/syncPresentation.ts';
import { SectionCard } from '@/components/operator';

type Props = {
  platforms: PlatformPublishResult[];
  onFixAccounts?: () => void;
};

export function SyncPlatformList({ platforms, onFixAccounts }: Props) {
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
          <SyncPlatformRow key={p.platformSlug} platform={p} onFixAccounts={onFixAccounts} />
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
  onFixAccounts,
}: {
  platform: PlatformPublishResult;
  onFixAccounts?: () => void;
}) {
  const meta = platformOutcomeMeta(p);
  const detail = friendlyPlatformDetail(p);
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
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.pill}`}
        >
          {meta.label}
        </span>
        <span className="text-sm font-semibold text-slate-900 truncate">{p.platformName}</span>
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
