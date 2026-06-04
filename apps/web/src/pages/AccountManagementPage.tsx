import { useState, useMemo } from 'react';
import { fetchAccounts, updateAccount } from '@/lib/api.ts';
import type { PlatformAccountDetail, AccountUpdatePayload } from '@/lib/types.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { registryToFilterChips } from '@/lib/filterChips.ts';
import {
  ACCOUNT_FILTER_CHIPS,
  accountStateVisual,
  ACCOUNT_STATE_REGISTRY,
  type AccountStateKey,
} from '@/lib/statusRegistry.ts';
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
import { Badge, Banner, Button, EmptyState, Skeleton } from '@/components/ui';
import type { BadgeColor } from '@/components/ui';

type StateFilter = (typeof ACCOUNT_FILTER_CHIPS)[number]['key'];

const CLASS_CONFIG: Record<string, { label: string; color: BadgeColor }> = {
  OWNED:             { label: 'Owned',        color: 'green'  },
  FEEDABLE:          { label: 'Feedable',     color: 'blue'   },
  ASSISTED:          { label: 'Assisted',     color: 'violet' },
  PARTNER_DEPENDENT: { label: 'Partner dep.', color: 'slate'  },
};

const STATE_OPTIONS = (Object.keys(ACCOUNT_STATE_REGISTRY) as AccountStateKey[]).map(key => ({
  value: key,
  label: ACCOUNT_STATE_REGISTRY[key].label,
}));

const OWNER_OPTIONS = [
  { value: '',         label: '—' },
  { value: 'DEALER',   label: 'Dealer' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'PLATFORM', label: 'Platform' },
];

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
    { key: 'total',          label: 'Total',          value: summary.total,          colorClass: 'text-slate-700' },
    { key: 'active',         label: 'Active',         value: summary.active,         colorClass: 'text-emerald-700' },
    { key: 'needsSetup',     label: 'Needs Setup',    value: summary.needsSetup,     colorClass: 'text-amber-700' },
    { key: 'pendingReview',  label: 'Pending Review', value: summary.pendingReview,  colorClass: 'text-sky-700' },
    { key: 'blocked',        label: 'Blocked',        value: summary.blocked,        colorClass: 'text-red-700' },
    { key: 'partnerRequired',label: 'Partner Req.',   value: summary.partnerRequired,colorClass: 'text-slate-500' },
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
          subtitle="Fix account gaps so Sync can reach every platform."
        />

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
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search platform, account ID, rep…"
            className="flex-1 max-w-md px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          {filter !== 'ALL' && (
            <button type="button" onClick={() => setFilter('ALL')} className="text-xs font-semibold text-emerald-700">
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
              title={accounts.length === 0 ? 'No platform accounts' : 'No matches'}
              subtitle={accounts.length === 0
                ? 'Accounts appear after your first sync run.'
                : 'Try another filter or search term.'}
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
          Blocked and Suspended states prevent publishing. Partner Required needs a commercial agreement first.
          Credential details (tokens, API keys) are stored and managed outside this portal.
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
                  Blocks publish
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
        <AccountEditForm account={account} dealerId={dealerId} onSaved={onSaved} onCancel={onToggle} />
      )}
    </>
  );
}

function AccountEditForm({ account, dealerId, onSaved, onCancel }: {
  account: PlatformAccountDetail;
  dealerId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AccountUpdatePayload>({
    state:            account.state,
    accountId:        account.accountId        ?? '',
    platformRepName:  account.platformRepName  ?? '',
    platformRepEmail: account.platformRepEmail ?? '',
    membershipStatus: account.membershipStatus ?? '',
    nextAction:       account.nextAction       ?? '',
    nextActionOwner:  account.nextActionOwner  ?? '',
    notes:            account.notes            ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Completeness hint — secondary guidance only, not a primary metric
  const missing: string[] = [];
  if (!form.accountId)                                 missing.push('Account ID');
  if (!form.platformRepName && !form.platformRepEmail) missing.push('platform rep contact');
  if (!form.nextAction)                                missing.push('next action');
  if (!form.membershipStatus)                          missing.push('membership status');

  const set = (field: keyof AccountUpdatePayload) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await updateAccount(dealerId, account.platformSlug, {
        state:            form.state,
        accountId:        form.accountId        || undefined,
        platformRepName:  form.platformRepName  || undefined,
        platformRepEmail: form.platformRepEmail || undefined,
        membershipStatus: form.membershipStatus || undefined,
        nextAction:       form.nextAction       || undefined,
        nextActionOwner:  form.nextActionOwner  || null,
        notes:            form.notes            || undefined,
      });
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className="px-5 pb-5 pt-2 bg-slate-50 border-b border-slate-100">
      {err && <div className="mb-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Account state">
          <select value={form.state ?? ''} onChange={set('state')} className="field-input">
            {STATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <FormField label="Account ID">
          <input type="text" value={form.accountId ?? ''} onChange={set('accountId')} placeholder="e.g. D-12345678" className="field-input" />
        </FormField>
        <FormField label="Membership / Subscription">
          <input type="text" value={form.membershipStatus ?? ''} onChange={set('membershipStatus')} placeholder="e.g. Premium, Standard" className="field-input" />
        </FormField>
        <FormField label="Platform rep name">
          <input type="text" value={form.platformRepName ?? ''} onChange={set('platformRepName')} placeholder="Contact name at platform" className="field-input" />
        </FormField>
        <FormField label="Platform rep email">
          <input type="email" value={form.platformRepEmail ?? ''} onChange={set('platformRepEmail')} placeholder="rep@platform.com" className="field-input" />
        </FormField>
        <FormField label="Next action owner">
          <select value={form.nextActionOwner ?? ''} onChange={set('nextActionOwner')} className="field-input">
            {OWNER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <div className="md:col-span-3">
          <FormField label="Next action">
            <input type="text" value={form.nextAction ?? ''} onChange={set('nextAction')} placeholder="What needs to happen next" className="field-input" />
          </FormField>
        </div>
        <div className="md:col-span-3">
          <FormField label="Notes">
            <textarea value={form.notes ?? ''} onChange={set('notes')} rows={2} placeholder="Internal notes (not shared with platform)" className="field-input resize-none" />
          </FormField>
        </div>
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-slate-400 mt-3">Consider adding: {missing.join(', ')}</p>
      )}
      <div className="flex gap-2 mt-2">
        <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>Save</Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
