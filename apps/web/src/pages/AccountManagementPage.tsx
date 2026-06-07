import { useState, useMemo } from 'react';
import { fetchAccounts } from '@/lib/api/sdk.ts';
import type { PlatformAccountDetail } from '@/lib/types.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { registryToFilterChips } from '@/lib/filterChips.ts';
import {
  ACCOUNT_FILTER_CHIPS,
  accountStateVisual,
  EMPTY_STATE_COPY,
} from '@/lib/statusRegistry.ts';
import { AccountEditForm } from '@/components/platforms/AccountEditForm.tsx';
import {
  OperatorPage,
  SectionCard,
  PageHeader,
  InlineCallout,
  AccountStateBadge,
  ErrorState,
} from '@/components/operator';
import { FilterChips, SummaryStrip } from '@/components/generic';
import type { SummaryItem } from '@/components/generic';
import { Badge, Banner, EmptyState, Skeleton } from '@/components/ui';
import { SearchField } from '@/components/ui/SearchField.tsx';
import type { BadgeColor } from '@/components/ui';

type StateFilter = (typeof ACCOUNT_FILTER_CHIPS)[number]['key'];

const CLASS_CONFIG: Record<string, { label: string; color: BadgeColor }> = {
  OWNED:             { label: 'Owned',        color: 'green'  },
  FEEDABLE:          { label: 'Feedable',     color: 'blue'   },
  ASSISTED:          { label: 'Assisted',     color: 'violet' },
  PARTNER_DEPENDENT: { label: 'Partner dep.', color: 'slate'  },
};

const ACCOUNT_CHIPS = registryToFilterChips(ACCOUNT_FILTER_CHIPS);

type Props = OperatorPageBaseProps;

export default function AccountManagementPage({ dealerId, nav, activeTab }: Props) {
  const { data, loading, error, reload: load, lastRefresh } = useAsyncQuery(
    () => fetchAccounts(dealerId),
    [dealerId]
  );
  const [filter, setFilter] = useState<StateFilter>('ALL');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  const accountRows = data?.accounts;
  const accounts = useMemo(() => accountRows ?? [], [accountRows]);
  const summary  = data?.summary;
  const blockingCount = accounts.filter(a => accountStateVisual(a.state).blocksPublishing).length;

  const visible = useMemo(() =>
    accounts.filter(a => {
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'ACTIVE'           && a.state === 'ACTIVE') ||
        (filter === 'NEEDS_SETUP'      && (a.state === 'ACCOUNT_NEEDED' || a.state === 'CREDENTIALS_NEEDED')) ||
        (filter === 'PENDING_REVIEW'   && a.state === 'PENDING_REVIEW') ||
        (filter === 'BLOCKED'          && (a.state === 'BLOCKED' || a.state === 'SUSPENDED')) ||
        (filter === 'PARTNER_REQUIRED' && a.state === 'PARTNER_REQUIRED');
      if (!matchesFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.platformName.toLowerCase().includes(q) ||
          a.platformSlug.toLowerCase().includes(q) ||
          (a.accountId ?? '').toLowerCase().includes(q);
      }
      return true;
    }),
    [accounts, filter, search]
  );

  const summaryItems: SummaryItem[] = summary ? [
    { key: 'total',          label: 'Total',          value: summary.total,          colorClass: 'text-ink-body' },
    { key: 'active',         label: 'Active',         value: summary.active,         colorClass: 'text-status-success-text' },
    { key: 'needsSetup',     label: 'Needs setup',    value: summary.needsSetup,     colorClass: 'text-status-warning-text' },
    { key: 'pendingReview',  label: 'Pending Review', value: summary.pendingReview,  colorClass: 'text-status-info-text' },
    { key: 'blocked',        label: 'Blocked',        value: summary.blocked,        colorClass: 'text-status-error-text' },
    { key: 'partnerRequired',label: 'Partner required', value: summary.partnerRequired, colorClass: 'text-ink-muted' },
  ] : [];

  const summaryActiveKey =
    filter === 'ACTIVE'           ? 'active' :
    filter === 'NEEDS_SETUP'      ? 'needsSetup' :
    filter === 'PENDING_REVIEW'   ? 'pendingReview' :
    filter === 'BLOCKED'          ? 'blocked' :
    filter === 'PARTNER_REQUIRED' ? 'partnerRequired' :
    undefined;

  const handleSummaryClick = (key: string) => {
    if (key === 'total') { setFilter('ALL'); return; }
    const map: Record<string, StateFilter> = {
      active: 'ACTIVE', needsSetup: 'NEEDS_SETUP', pendingReview: 'PENDING_REVIEW',
      blocked: 'BLOCKED', partnerRequired: 'PARTNER_REQUIRED',
    };
    const f = map[key];
    if (f) setFilter(cur => cur === f ? 'ALL' : f);
  };

  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={load}
      refreshing={loading}
      lastRefresh={lastRefresh ?? undefined}
    >
      <div className="space-y-5">
        <PageHeader
          title="Platform accounts"
          infoDocId="platforms/account-states"
          subtitle="Finish account setup so every platform can receive inventory."
        />

        {blockingCount === 0 && accounts.length > 0 && (
          <InlineCallout tone="success" title={EMPTY_STATE_COPY.noAccountBlockers.title} icon="✓">
            {EMPTY_STATE_COPY.noAccountBlockers.subtitle}
          </InlineCallout>
        )}

        {blockingCount > 0 && (
          <InlineCallout
            tone="danger"
            title={`${blockingCount} account${blockingCount !== 1 ? 's' : ''} block${blockingCount === 1 ? 's' : ''} publishing`}
            action={
              <button type="button" onClick={() => setFilter('BLOCKED')} className="text-xs font-bold text-red-800">
                Show blocked
              </button>
            }
          >
            These platforms will stay blocked on Sync until their account state is resolved.
          </InlineCallout>
        )}

        {saveResult && (
          <Banner variant="success" onDismiss={() => setSaveResult(null)}>{saveResult}</Banner>
        )}

        {error && !data && <ErrorState message={error} onRetry={load} />}
        {error && data && (
          <Banner variant="error" action={<button type="button" onClick={load} className="text-xs underline">Retry</button>}>
            {error}
          </Banner>
        )}

        <SummaryStrip
          items={summaryItems}
          loading={loading && !data}
          activeKey={summaryActiveKey}
          onItemClick={handleSummaryClick}
        />

        <FilterChips
          chips={ACCOUNT_CHIPS}
          activeKey={filter}
          onSelect={key => setFilter(key as StateFilter)}
        />

        <div className="flex items-center gap-3">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search platform, account ID, rep…"
            className="flex-1 max-w-md"
          />
          {filter !== 'ALL' && (
            <button type="button" onClick={() => setFilter('ALL')} className="text-xs font-semibold text-orange-600">
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400">{visible.length} shown</span>
        </div>

        <SectionCard noPadding>
          <div className="grid grid-cols-[1fr_11rem_8rem_8rem_7rem] px-5 py-3 bg-slate-50/80 border-b border-slate-100 gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {['Platform', 'State', 'Account ID', 'Next Action Owner', 'Last Checked'].map(h => (
              <span key={h}>{h}</span>
            ))}
          </div>

          {loading && !data ? (
            <Skeleton rows={8} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon="🔗"
              title={accounts.length === 0 ? EMPTY_STATE_COPY.noAccounts.title : EMPTY_STATE_COPY.noAccountMatches.title}
              subtitle={accounts.length === 0 ? EMPTY_STATE_COPY.noAccounts.subtitle : EMPTY_STATE_COPY.noAccountMatches.subtitle}
            />
          ) : (
            <div className="divide-y divide-slate-50">
              {visible.map(account => (
                <AccountRow
                  key={account.platformSlug}
                  account={account}
                  expanded={expanded === account.platformSlug}
                  onToggle={() => setExpanded(e => e === account.platformSlug ? null : account.platformSlug)}
                  dealerId={dealerId}
                  onSaved={() => { setSaveResult(`Saved ${account.platformName}`); setExpanded(null); load(); }}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <p className="text-xs text-slate-400 px-1">
          Blocked accounts stop updates. Partner required means a commercial agreement is needed first.
          Login credentials are managed outside this portal.
        </p>
      </div>
    </OperatorPage>
  );
}

function AccountRow({ account, expanded, onToggle, dealerId, onSaved }: {
  account: PlatformAccountDetail;
  expanded: boolean;
  onToggle: () => void;
  dealerId: string;
  onSaved: () => void;
}) {
  const meta = accountStateVisual(account.state);
  const cls  = CLASS_CONFIG[account.integrationClass] ?? { label: account.integrationClass, color: 'slate' as BadgeColor };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => e.key === 'Enter' && onToggle()}
        className={`grid grid-cols-[1fr_11rem_8rem_8rem_7rem] px-5 py-3.5 gap-3 items-center cursor-pointer text-xs transition-colors
          ${meta.blocksPublishing ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50/80'}
          ${expanded ? 'bg-slate-50' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-900 truncate block">{account.platformName}</span>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge color={cls.color}>{cls.label}</Badge>
              {meta.blocksPublishing && (
                <span className="text-[10px] font-bold uppercase text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                  Blocked
                </span>
              )}
            </div>
          </div>
        </div>
        <AccountStateBadge state={account.state} />
        <span className="text-slate-500 font-mono truncate">{account.accountId ?? '—'}</span>
        <span className="text-slate-500">{account.nextActionOwner ?? '—'}</span>
        <span className="text-slate-400">
          {account.lastChecked ? new Date(account.lastChecked).toLocaleDateString() : '—'}
        </span>
      </div>
      {expanded && (
        <div className="px-5 pb-5 pt-2 bg-slate-50 border-b border-slate-100">
          <AccountEditForm account={account} dealerId={dealerId} onSaved={onSaved} onCancel={onToggle} />
        </div>
      )}
    </>
  );
}
