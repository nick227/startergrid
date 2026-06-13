import { useState, useMemo } from 'react';
import { fetchDealers } from '@/lib/api/sdk.ts';
import { fetchAdminDashboard, fetchBlockedDealers } from '@/lib/api/admin.ts';
import type { AdminBlockedDealerItem, AdminDealerAttentionItem, AdminRecentEventItem } from '@/lib/api/admin.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { ErrorState, SectionCard, OperatorPage } from '@/components/operator/index.ts';
import type { OperatorNavHandlers, OperatorTab } from '@/lib/operatorNav.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';

function categoryLabel(id: string): string {
  return resolveCategorySchema(id).label;
}

const SEVERITY_CFG: Record<string, { label: string; cls: string }> = {
  critical: { label: 'CRITICAL', cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  warning:  { label: 'WARNING',  cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  info:     { label: 'INFO',     cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
};

type Tab = 'overview' | 'triage' | 'blocked' | 'audit';

function CopyableId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy dealer ID"
      className="group inline-flex items-center gap-1.5 font-mono text-xs text-ink-faint hover:text-ink-muted transition-colors"
    >
      {value}
      <span className={`text-[10px] transition-colors ${copied ? 'text-green-600' : 'text-silver-400 group-hover:text-ink-faint'}`}>
        {copied ? 'copied' : '⎘'}
      </span>
    </button>
  );
}

const TAB_LIST: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'triage',   label: 'Triage' },
  { key: 'blocked',  label: 'Blocked' },
  { key: 'audit',    label: 'Audit' },
];

type Props = {
  dealerId: string;
  nav: OperatorNavHandlers;
  activeTab: OperatorTab;
};

export default function AdminDealerPage({ dealerId, nav, activeTab }: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  const { data: dealersData, loading: dealersLoading, error: dealersError, reload: reloadDealers } =
    useAsyncQuery(() => fetchDealers(), []);

  const { data: dashboard, loading: dashLoading, error: dashError, reload: reloadDash } =
    useAsyncQuery(() => fetchAdminDashboard(), []);

  const { data: blockers, loading: blockersLoading, error: blockersError, reload: reloadBlockers } =
    useAsyncQuery(() => fetchBlockedDealers({ dealerId, limit: 50 }), [dealerId]);

  const dealer = useMemo(
    () => dealersData?.dealers.find(d => d.id === dealerId) ?? null,
    [dealersData, dealerId],
  );

  const triageItems: AdminDealerAttentionItem[] = useMemo(
    () => (dashboard?.dealerAttention ?? []).filter(i => i.dealerId === dealerId),
    [dashboard, dealerId],
  );

  const auditItems: AdminRecentEventItem[] = useMemo(
    () => (dashboard?.recentEvents ?? []).filter(i => i.dealerId === dealerId),
    [dashboard, dealerId],
  );

  const blockedItems: AdminBlockedDealerItem[] = blockers?.items ?? [];

  const loading = dealersLoading || dashLoading || blockersLoading;
  const error   = dealersError || dashError || blockersError;
  const reload  = () => { reloadDealers(); reloadDash(); reloadBlockers(); };

  if (loading) {
    return <div className="surface-card-operator p-6"><Skeleton rows={6} /></div>;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!dealer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="text-4xl font-black text-silver-300 select-none">404</div>
        <h2 className="text-lg font-bold text-ink-heading">Dealer not found</h2>
        <p className="text-sm text-ink-muted max-w-sm">
          No dealer with ID{' '}
          <span className="font-mono bg-surface-inset border border-silver-200 px-1.5 py-0.5 rounded text-xs text-ink-heading">
            {dealerId}
          </span>{' '}
          exists in the system. Use the Dealers tab to navigate back.
        </p>
      </div>
    );
  }

  const memberSince = new Date(dealer.createdAt).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={dealer.legalName}
      activeTab={activeTab}
      nav={nav}
      sectionLabel="Overview"
    >
      {/* Secondary internal navigation */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TAB_LIST.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${
              tab === t.key
                ? 'bg-navy-800 text-white shadow-sm'
                : 'bg-white text-ink-muted border border-silver-200 hover:border-silver-300 hover:text-ink-heading'
            }`}
          >
            {t.label}
            {t.key === 'triage' && triageItems.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === t.key ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'
              }`}>
                {triageItems.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <SectionCard title="Dealer Identity">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-ink-muted font-semibold uppercase tracking-wider mb-0.5">Legal Name</dt>
                <dd className="text-ink-heading font-medium">{dealer.legalName}</dd>
              </div>
              {dealer.dbaName && dealer.dbaName !== dealer.legalName && (
                <div>
                  <dt className="text-xs text-ink-muted font-semibold uppercase tracking-wider mb-0.5">DBA Name</dt>
                  <dd className="text-ink-heading">{dealer.dbaName}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-ink-muted font-semibold uppercase tracking-wider mb-0.5">Category</dt>
                <dd className="text-ink-heading">
                  {categoryLabel(dealer.businessCategory)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted font-semibold uppercase tracking-wider mb-0.5">Member Since</dt>
                <dd className="text-ink-heading">{memberSince}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted font-semibold uppercase tracking-wider mb-0.5">Dealer ID</dt>
                <dd><CopyableId value={dealer.id} /></dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Open Triage Items">
            {triageItems.length === 0 ? (
              <p className="text-sm text-ink-faint py-2">No open attention items for this dealer.</p>
            ) : (
              <ul className="space-y-2">
                {triageItems.slice(0, 5).map((item, i) => {
                  const sev = SEVERITY_CFG[item.severity] ?? SEVERITY_CFG.info;
                  return (
                    <li key={i} className="flex items-start gap-3 py-2 border-b border-silver-100 last:border-0">
                      <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border ${sev.cls}`}>
                        {sev.label}
                      </span>
                      <div className="min-w-0 w-full">
                        {item.source === 'dealer_partner_credentials' ? (
                          <div className="text-sm text-red-800 bg-red-50 p-2 rounded-md border border-red-100 font-medium truncate">
                            <span className="font-bold text-[10px] uppercase tracking-widest block mb-0.5">Validation Failure</span>
                            {item.reason}
                          </div>
                        ) : (
                          <div className="text-sm text-ink-heading font-medium truncate">{item.reason}</div>
                        )}
                        <div className="text-xs text-ink-muted mt-1 font-mono">{item.platformSlug}</div>
                        {item.nextAction && (
                          <div className="text-xs text-orange-600 mt-1">{item.nextAction}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
                {triageItems.length > 5 && (
                  <li className="pt-1">
                    <button
                      type="button"
                      onClick={() => setTab('triage')}
                      className="text-xs text-navy-600 hover:text-navy-500 font-semibold"
                    >
                      View all {triageItems.length} items →
                    </button>
                  </li>
                )}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'triage' && (
        <div className="space-y-3">
          {triageItems.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-silver-200 rounded-md text-ink-faint text-sm">
              No open triage items for this dealer.
            </div>
          ) : (
            triageItems.map((item, i) => {
              const sev = SEVERITY_CFG[item.severity] ?? SEVERITY_CFG.info;
              return (
                <div key={i} className="surface-card-operator p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sev.cls}`}>
                      {sev.label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-surface-inset text-ink-muted border border-silver-200">
                      {item.platformSlug}
                    </span>
                  </div>
                  {item.source === 'dealer_partner_credentials' ? (
                    <div className="text-sm text-red-800 bg-red-50 p-3 rounded-md border border-red-200">
                      <span className="font-bold text-[10px] uppercase tracking-widest block mb-1">Validation Failure</span>
                      {item.reason}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-heading">{item.reason}</p>
                  )}
                  {item.nextAction && (
                    <p className="text-xs text-orange-600 bg-orange-100/40 border border-orange-100 p-2 rounded-md">
                      <span className="font-bold">Next Action:</span> {item.nextAction}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'blocked' && (
        <SectionCard title="Blocked Configurations">
          {blockedItems.length === 0 ? (
            <p className="text-sm text-ink-faint py-2">No blocked configurations for this dealer.</p>
          ) : (
            <ul className="divide-y divide-silver-100">
              {blockedItems.map(item => {
                const sev = SEVERITY_CFG[item.severity] ?? SEVERITY_CFG.info;
                return (
                  <li key={item.id} className="py-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sev.cls}`}>
                        {sev.label}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-surface-inset text-ink-muted border border-silver-200">
                        {item.platformSlug}
                      </span>
                      <span className="text-xs text-ink-faint">{item.source}</span>
                    </div>
                    <p className="text-sm text-ink-heading">{item.reason}</p>
                    {item.nextAction && (
                      <p className="text-xs text-orange-600 bg-orange-100/40 border border-orange-100 p-2 rounded-md">
                        <span className="font-bold">Next Action:</span> {item.nextAction}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      )}

      {tab === 'audit' && (
        <SectionCard title="Audit Log">
          {auditItems.length === 0 ? (
            <p className="text-sm text-ink-faint py-2">No recent audit events for this dealer.</p>
          ) : (
            <ul className="divide-y divide-silver-100">
              {auditItems.map(item => (
                <li key={item.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-heading">{item.action}</p>
                    <time className="text-xs text-ink-faint">{new Date(item.createdAt).toLocaleString()}</time>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{item.actorEmail}</p>
                  {item.detailString && (
                    <p className="mt-2 text-xs text-ink-muted bg-surface-inset border border-silver-100 rounded p-2">
                      {item.detailString}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}
    </OperatorPage>
  );
}
