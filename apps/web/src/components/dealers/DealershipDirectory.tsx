import { useEffect, useMemo, useState } from 'react';
import { fetchAdminDealerships, type DealershipRecordSummary } from '@/lib/api/dealershipRecordApi.ts';
import { fetchBlockedDealers } from '@/lib/api/admin.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { lifecycleLabel, relativeTime, SETUP_LIFECYCLES, type LifecycleTone } from '@/lib/dealershipLabels.ts';
import { needsOurAction, summaryNextAction } from '@/lib/dealershipNextStep.ts';
import { ownerLabel } from '@/lib/taskOwnership.ts';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { CreateDealershipDialog } from './CreateDealershipDialog.tsx';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';

export type DirectoryFilter = 'mine' | 'action' | 'setup' | 'all';

const FILTERS: Array<[DirectoryFilter, string]> = [
  ['mine', 'Mine'],
  ['action', 'Needs action'],
  ['setup', 'Setting up'],
  ['all', 'All'],
];

const TONE_DOT: Record<LifecycleTone, string> = {
  neutral: 'bg-silver-400',
  progress: 'bg-status-warning-text',
  ready: 'bg-status-info-text',
  live: 'bg-status-success-text',
  paused: 'bg-ink-muted',
};

type Props = {
  currentUserId?: string | null;
  /** Site administrators also see cross-channel publishing issues on each row. */
  includeChannelIssues: boolean;
  onOpenDealership: (dealerId: string) => void;
};

export function filterDealerships(
  rows: DealershipRecordSummary[],
  filter: DirectoryFilter,
  ctx: { currentUserId?: string | null; channelIssues: Record<string, number>; query: string },
): DealershipRecordSummary[] {
  const q = ctx.query.trim().toLowerCase();
  return rows.filter(row => {
    if (q && ![row.legalName, row.dbaName ?? '', row.primaryContactEmail ?? ''].some(v => v.toLowerCase().includes(q))) return false;
    if (filter === 'mine') return Boolean(ctx.currentUserId) && row.internalOwner?.id === ctx.currentUserId;
    if (filter === 'action') return needsOurAction(row, ctx.channelIssues[row.id] ?? 0);
    if (filter === 'setup') return SETUP_LIFECYCLES.includes(row.lifecycleStatus);
    return true;
  });
}

/** The dealership directory is also the work list: every row shows its next action and who owns it. */
export function DealershipDirectory({ currentUserId, includeChannelIssues, onOpenDealership }: Props) {
  const dealers = useAsyncQuery(() => fetchAdminDealerships({ limit: 200 }), []);
  const blocked = useAsyncQuery(
    () => (includeChannelIssues ? fetchBlockedDealers({ limit: 100 }) : Promise.resolve(null)),
    [includeChannelIssues],
  );
  const [filter, setFilter] = useState<DirectoryFilter | null>(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => dealers.data?.dealerships ?? [], [dealers.data]);
  const channelIssues = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(rows.map(row => [row.id, row.openDistributionIncidents ?? 0]));
    for (const item of blocked.data?.items ?? []) counts[item.dealerId] = (counts[item.dealerId] ?? 0) + 1;
    return counts;
  }, [blocked.data, rows]);

  // Start on "Mine" when the viewer owns dealerships, otherwise on "Needs action".
  const hasMine = rows.some(row => currentUserId && row.internalOwner?.id === currentUserId);
  const activeFilter: DirectoryFilter = filter ?? (dealers.data ? (hasMine ? 'mine' : 'action') : 'mine');
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([id]) =>
    [id, filterDealerships(rows, id, { currentUserId, channelIssues, query: '' }).length])) as Record<DirectoryFilter, number>,
  [rows, currentUserId, channelIssues]);
  const visible = filterDealerships(rows, activeFilter, { currentUserId, channelIssues, query });

  useEffect(() => {
    if (dealers.error) setFilter(f => f ?? 'all');
  }, [dealers.error]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-heading">Dealerships</h1>
          <p className="text-sm text-ink-muted">Find a dealership, see who needs to do what, and open it to continue setup or help a customer.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary-operator text-sm self-start sm:self-auto">
          Add dealership
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter dealerships">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={activeFilter === id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                activeFilter === id ? 'bg-navy-900 text-white' : 'bg-silver-100 text-ink-muted hover:text-ink-heading'
              }`}>
              {label}
              {dealers.data && <span className={`ml-1.5 text-xs ${activeFilter === id ? 'text-silver-200' : 'text-ink-faint'}`}>{counts[id]}</span>}
            </button>
          ))}
        </div>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search dealerships"
          placeholder="Search name or email" className="md:ml-auto w-full md:w-64 px-3 py-1.5 text-sm border border-silver-300 rounded-md bg-surface-card" />
      </div>

      {dealers.loading && !dealers.data ? (
        <div className="surface-card-operator p-6"><Skeleton rows={8} /></div>
      ) : dealers.error ? (
        <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white text-sm" role="alert">
          {dealers.error}{' '}
          <button type="button" onClick={() => dealers.reload()} className="font-semibold text-navy-700 hover:underline">Try again</button>
        </div>
      ) : rows.length === 0 ? (
        <PagePrimaryState
          kind="empty"
          title="Create a dealership to get started"
          why="A dealership is a rooftop you set up, give access to, and help through listing."
          next="Add the first dealership, then invite the owner."
          ownerKind="YOU"
          actionLabel="Add dealership"
          onAction={() => setCreating(true)}
        />
      ) : visible.length === 0 ? (
        <div className="surface-card-operator p-8 rounded-xl border border-silver-200 bg-white text-center">
          <p className="text-sm font-medium text-ink-heading">
            {query ? 'No dealerships match this search.' : activeFilter === 'mine' ? 'You are not the internal owner of any dealership.'
              : activeFilter === 'action' ? 'Nothing needs our team right now.' : 'No dealerships here yet.'}
          </p>
          {activeFilter !== 'all' && !query && (
            <button type="button" onClick={() => setFilter('all')} className="mt-2 text-sm font-semibold text-navy-700 hover:underline">Show all dealerships</button>
          )}
        </div>
      ) : (
        <div className="surface-card-operator rounded-xl border border-silver-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-silver-50 text-xs text-ink-muted border-b border-silver-200">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">Business</th>
                <th scope="col" className="px-4 py-2.5 font-semibold hidden lg:table-cell">Category</th>
                <th scope="col" className="px-4 py-2.5 font-semibold hidden md:table-cell">Status</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Next action</th>
                <th scope="col" className="px-4 py-2.5 font-semibold hidden sm:table-cell text-right">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-silver-200">
              {visible.map(row => {
                const status = lifecycleLabel(row.lifecycleStatus);
                const next = summaryNextAction(row);
                const issues = (channelIssues[row.id] ?? 0) + (row.blockedStepCount ?? 0);
                return (
                  <tr key={row.id} onClick={() => onOpenDealership(row.id)} className="cursor-pointer hover:bg-surface-inset">
                    <td className="px-4 py-3">
                      <a href={`#/admin/dealers/${row.id}`} onClick={e => { e.preventDefault(); onOpenDealership(row.id); }}
                        className="font-semibold text-ink-heading hover:underline">
                        {row.dbaName || row.legalName}
                      </a>
                      {row.dbaName && row.dbaName !== row.legalName && <p className="text-xs text-ink-muted">{row.legalName}</p>}
                      <p className="text-xs text-ink-muted lg:hidden">{resolveCategorySchema(row.businessCategory).label}</p>
                      <p className="text-xs text-ink-muted md:hidden">{status.label}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-ink-body">{resolveCategorySchema(row.businessCategory).label}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-ink-body">
                        <span aria-hidden="true" className={`w-2 h-2 rounded-full ${TONE_DOT[status.tone]}`} />
                        {status.label}
                      </span>
                      {issues > 0 && (
                        <p className="text-xs text-status-error-text">{issues} {issues === 1 ? 'issue' : 'issues'} to resolve</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink-heading">{next.label}</p>
                      {next.owner && (
                        <p className="text-xs text-ink-muted">
                          {ownerLabel(next.owner, next.owner === 'OUR_TEAM' ? row.internalOwner?.email : null)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-right text-xs text-ink-muted whitespace-nowrap">
                      {relativeTime(row.lastActivityAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length >= 200 && (
        <p className="text-xs text-ink-muted">Showing the first 200 dealerships. Use search to narrow down.</p>
      )}

      {creating && (
        <CreateDealershipDialog
          onClose={() => setCreating(false)}
          onCreated={() => dealers.reload()}
          onOpenDealership={(id) => { setCreating(false); onOpenDealership(id); }}
        />
      )}
    </div>
  );
}
