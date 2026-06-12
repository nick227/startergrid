import { useCallback, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ErrorState } from '@/components/operator/index.ts';
import { DealershipIntakeFlow } from '@/components/dealers/DealershipIntakeFlow.tsx';
import { createAdminDealership, uploadDealerLogo } from '@/lib/api/sdk.ts';
import { adminDealerHash } from '@/lib/routes.ts';
import type { AdminDashboardResponse } from '@/lib/api/admin.ts';
import type { CreateDealershipResponse, DealerSummary } from '@/lib/types.ts';
import { ResultCount, SortableHeaderCell, type SortDir } from '@/features/adminOverview/components/index.ts';
import { CLEAR_CLS, INPUT_CLS, SELECT_CLS } from '@/features/adminOverview/constants/styles.ts';
import { buildDealerTriageMap, getDealerIssueWeight } from '@/features/adminOverview/utils/dealerTriage.ts';

type DealerSortField = 'legalName' | 'businessCategory' | 'createdAt' | 'issues';

type Props = {
  dealersData: { dealers: DealerSummary[] } | null;
  dealersLoading: boolean;
  dealersError: string | null;
  dealerAttention: AdminDashboardResponse['dealerAttention'];
  onDealersChanged?: () => void;
};

export function DealershipsTab({
  dealersData,
  dealersLoading,
  dealersError,
  dealerAttention,
  onDealersChanged,
}: Props) {
  const [showAddDealer, setShowAddDealer] = useState(false);
  const [dealerSearch, setDealerSearch] = useState('');
  const [dealerCategory, setDealerCategory] = useState('');
  const [dealerSort, setDealerSort] = useState<DealerSortField>('legalName');
  const [dealerDir, setDealerDir] = useState<SortDir>('asc');

  const allDealers = useMemo(() => dealersData?.dealers ?? [], [dealersData]);
  const triageByDealer = useMemo(() => buildDealerTriageMap(dealerAttention), [dealerAttention]);

  const dealerIssueWeight = useCallback((id: string) => {
    return getDealerIssueWeight(triageByDealer[id]);
  }, [triageByDealer]);

  const dealerCategories = useMemo(
    () => [...new Set(allDealers.map(d => d.businessCategory))].sort(),
    [allDealers],
  );

  const filteredDealers = useMemo(() => {
    let list = [...allDealers];
    if (dealerSearch) {
      const q = dealerSearch.toLowerCase();
      list = list.filter(d =>
        d.legalName.toLowerCase().includes(q) ||
        (d.dbaName?.toLowerCase().includes(q) ?? false) ||
        d.id.toLowerCase().includes(q),
      );
    }
    if (dealerCategory) list = list.filter(d => d.businessCategory === dealerCategory);
    list.sort((a, b) => {
      let cmp = 0;
      if (dealerSort === 'legalName') cmp = a.legalName.localeCompare(b.legalName);
      else if (dealerSort === 'businessCategory') cmp = a.businessCategory.localeCompare(b.businessCategory);
      else if (dealerSort === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
      else if (dealerSort === 'issues') cmp = dealerIssueWeight(a.id) - dealerIssueWeight(b.id);
      return dealerDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allDealers, dealerSearch, dealerCategory, dealerSort, dealerDir, dealerIssueWeight]);

  const dealerActiveFilters = [dealerSearch, dealerCategory].filter(Boolean).length;

  function toggleDealer(field: DealerSortField) {
    if (dealerSort === field) setDealerDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
    else {
      setDealerSort(field);
      setDealerDir('asc');
    }
  }

  function handleDealerCreated(response: CreateDealershipResponse) {
    setShowAddDealer(false);
    onDealersChanged?.();
    window.location.assign(response.nextHref);
  }

  return (
    <>
      {showAddDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3">
            <DealershipIntakeFlow
              mode="admin"
              onSubmit={createAdminDealership}
              onUploadLogo={uploadDealerLogo}
              onComplete={handleDealerCreated}
              onCancel={() => setShowAddDealer(false)}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={dealerSearch}
            onChange={e => setDealerSearch(e.target.value)}
            placeholder="Search name or ID…"
            className={`${INPUT_CLS} w-48`}
          />
          <select value={dealerCategory} onChange={e => setDealerCategory(e.target.value)} className={SELECT_CLS}>
            <option value="">All Categories</option>
            {dealerCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          {dealerActiveFilters > 0 && (
            <button type="button" onClick={() => { setDealerSearch(''); setDealerCategory(''); }} className={CLEAR_CLS}>
              Clear ({dealerActiveFilters})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddDealer(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors"
          >
            Add Dealership
          </button>
          {Object.keys(triageByDealer).length > 0 && (
            <span className="ml-auto text-xs text-status-warning-text">
              {Object.keys(triageByDealer).length} with open issues
            </span>
          )}
        </div>

        {dealersLoading && !dealersData && (
          <div className="surface-card-operator p-5"><Skeleton rows={8} /></div>
        )}
        {dealersError && <ErrorState message={dealersError} />}

        {!dealersLoading && !dealersError && (
          <>
            <ResultCount shown={filteredDealers.length} total={allDealers.length} noun="dealership" />
            <div className="surface-card-operator overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                    <SortableHeaderCell isActive={dealerSort === 'legalName'} dir={dealerDir} onClick={() => toggleDealer('legalName')}>Dealership</SortableHeaderCell>
                    <SortableHeaderCell isActive={dealerSort === 'businessCategory'} dir={dealerDir} onClick={() => toggleDealer('businessCategory')}>Category</SortableHeaderCell>
                    <SortableHeaderCell isActive={dealerSort === 'createdAt'} dir={dealerDir} onClick={() => toggleDealer('createdAt')}>Member Since</SortableHeaderCell>
                    <SortableHeaderCell isActive={dealerSort === 'issues'} dir={dealerDir} onClick={() => toggleDealer('issues')}>Open Issues</SortableHeaderCell>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDealers.map(dealer => {
                    const triage = triageByDealer[dealer.id];
                    return (
                      <tr key={dealer.id} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                        <td className="px-4 py-3">
                          <a href={adminDealerHash(dealer.id)} className="font-semibold text-navy-700 hover:text-navy-600 hover:underline text-sm">
                            {dealer.legalName}
                          </a>
                          {dealer.dbaName && dealer.dbaName !== dealer.legalName && (
                            <div className="text-[11px] text-ink-muted mt-0.5">dba {dealer.dbaName}</div>
                          )}
                          <div className="text-[10px] text-ink-faint font-mono mt-0.5">{dealer.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border">
                            {dealer.businessCategory}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted font-mono whitespace-nowrap">
                          {new Date(dealer.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {!triage ? (
                            <span className="text-[10px] text-ink-faint">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {triage.critical > 0 && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-error-bg text-status-error-text border-status-error-border">
                                  {triage.critical} critical
                                </span>
                              )}
                              {triage.warning > 0 && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-warning-bg text-status-warning-text border-status-warning-border">
                                  {triage.warning} warning
                                </span>
                              )}
                              {triage.info > 0 && triage.critical === 0 && triage.warning === 0 && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-info-bg text-status-info-text border-status-info-border">
                                  {triage.info} info
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <a href={adminDealerHash(dealer.id)} className="px-2.5 py-1 text-[10px] font-semibold text-orange-600 hover:text-orange-500 border border-orange-100 hover:border-orange-100 rounded transition-all">Manage</a>
                            <a href={`#/${dealer.id}/platforms`} className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded transition-all">Platforms</a>
                            <a href={`#/${dealer.id}/inventory`} className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded transition-all">Inventory</a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDealers.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-faint text-sm">No dealerships match the search criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
