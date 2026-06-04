import { useState } from 'react';
import type { PlatformPublishResult, IntegrationClass } from '../lib/types.ts';
import { PublishStateBadge } from './operator/StatusBadge.tsx';
import { SectionCard } from './operator/SectionCard.tsx';
import { READINESS_COLOR_REGISTRY } from '../lib/statusRegistry.ts';

type Props = {
  platforms: PlatformPublishResult[];
  readinessSummary: { green: number; yellow: number; red: number };
  onManageAccounts?: () => void;
};

const CLASS_ORDER: IntegrationClass[] = ['OWNED', 'FEEDABLE', 'ASSISTED', 'PARTNER_DEPENDENT'];
const CLASS_LABEL: Record<IntegrationClass, string> = {
  OWNED: 'Owned channel',
  FEEDABLE: 'Self-serve feed',
  ASSISTED: 'Assisted onboarding',
  PARTNER_DEPENDENT: 'Partner agreement required',
};

const ACCOUNT_STATE_LABEL: Record<string, string> = {
  BLOCKED: 'Account blocked',
  SUSPENDED: 'Account suspended',
  ACCOUNT_NEEDED: 'No account',
  CREDENTIALS_NEEDED: 'Credentials needed',
  PENDING_REVIEW: 'Pending review',
  PARTNER_REQUIRED: 'Partner agreement needed',
};

const DETAIL_STATES = new Set(['Blocked', 'Failed', 'Needs Approval', 'Packet Prepared']);

function isAccountCausedBlock(state: string, accountState: string | null): boolean {
  if (!accountState) return false;
  if (state === 'Blocked' && (accountState === 'BLOCKED' || accountState === 'SUSPENDED')) return true;
  if (state === 'Partner Required' && accountState === 'PARTNER_REQUIRED') return true;
  return false;
}

export default function PlatformGrid({ platforms, readinessSummary, onManageAccounts }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const accountBlockedCount = platforms.filter(p => isAccountCausedBlock(p.state, p.accountState)).length;

  const grouped = CLASS_ORDER.reduce<Record<IntegrationClass, PlatformPublishResult[]>>(
    (acc, cls) => ({ ...acc, [cls]: platforms.filter(p => p.integrationClass === cls) }),
    {} as Record<IntegrationClass, PlatformPublishResult[]>
  );

  return (
    <SectionCard
      title="Platform status"
      subtitle={`${readinessSummary.green}G · ${readinessSummary.yellow}Y · ${readinessSummary.red}R${accountBlockedCount > 0 ? ` · ${accountBlockedCount} account blocker${accountBlockedCount !== 1 ? 's' : ''}` : ''}`}
      noPadding
      action={
        <div className="flex items-center gap-2">
          {accountBlockedCount > 0 && onManageAccounts && (
            <button type="button" onClick={onManageAccounts} className="text-xs font-bold text-red-700 hover:underline">
              Fix accounts →
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="text-xs font-medium text-slate-500 px-3 py-1.5 rounded-lg bg-slate-100"
          >
            {showAdvanced ? 'Hide details' : 'Show details'}
          </button>
        </div>
      }
    >
      <div className="divide-y divide-slate-100">
        {CLASS_ORDER.map(cls => {
          const group = grouped[cls];
          if (!group?.length) return null;
          return (
            <div key={cls}>
              <div className="px-5 py-2.5 bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {CLASS_LABEL[cls]}
              </div>
              <div className="divide-y divide-slate-50">
                {group.map(p => (
                  <PlatformRow
                    key={p.platformSlug}
                    platform={p}
                    showAdvanced={showAdvanced}
                    onManageAccounts={onManageAccounts}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function PlatformRow({
  platform: p,
  showAdvanced,
  onManageAccounts,
}: {
  platform: PlatformPublishResult;
  showAdvanced: boolean;
  onManageAccounts?: () => void;
}) {
  const showDetail = DETAIL_STATES.has(p.state) || showAdvanced;
  const acctBlocked = isAccountCausedBlock(p.state, p.accountState);
  const acctLabel = p.accountState ? ACCOUNT_STATE_LABEL[p.accountState] : null;
  const readiness = READINESS_COLOR_REGISTRY[p.readiness];

  return (
    <div
      className={`px-5 py-3.5 grid grid-cols-1 sm:grid-cols-[10rem_1fr_auto] gap-3 items-center transition-colors ${
        acctBlocked ? 'bg-red-50/40' : 'hover:bg-slate-50/80'
      }`}
    >
      <PublishStateBadge state={p.state} />
      <div className="min-w-0">
        <span className="text-sm font-semibold text-slate-900 block truncate">{p.platformName}</span>
        {showDetail && <span className="text-xs text-slate-500 block truncate mt-0.5">{p.detail}</span>}
        {acctBlocked && acctLabel && (
          <span className="text-xs text-red-700 font-semibold mt-1 block">{acctLabel} — blocks publishing</span>
        )}
      </div>
      <div className="flex items-center gap-2 justify-end">
        {readiness && (
          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${readiness.pill}`}>{p.readiness[0]}</span>
        )}
        {acctBlocked && onManageAccounts && (
          <button type="button" onClick={onManageAccounts} className="text-xs font-bold text-red-700 whitespace-nowrap">
            Accounts →
          </button>
        )}
      </div>
    </div>
  );
}
