import { useState, useMemo } from 'react';
import { fetchDealers } from '@/lib/api/sdk.ts';
import { fetchAdminDashboard } from '@/lib/api/admin.ts';
import type { AdminDealerAttentionItem } from '@/lib/api/admin.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { AdminShell, ErrorState, SectionCard } from '@/components/operator/index.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';

const BUSINESS_CATEGORY_LABELS: Record<string, string> = {
  AUTOMOTIVE: 'Automotive',
  BOAT: 'Marine / Boats',
  TRAILER_RV_POWERSPORTS: 'Trailers, RV & Powersports',
};

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

type Props = { dealerId: string };

export default function AdminDealerPage({ dealerId }: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  const { data: dealersData, loading: dealersLoading, error: dealersError, reload: reloadDealers } =
    useAsyncQuery(() => fetchDealers(), []);

  const { data: dashboard, loading: dashLoading, error: dashError, reload: reloadDash } =
    useAsyncQuery(() => fetchAdminDashboard(), []);

  const dealer = useMemo(
    () => dealersData?.dealers.find(d => d.id === dealerId) ?? null,
    [dealersData, dealerId],
  );

  const triageItems: AdminDealerAttentionItem[] = useMemo(
    () => (dashboard?.dealerAttention ?? []).filter(i => i.dealerId === dealerId),
    [dashboard, dealerId],
  );

  const triageCounts = useMemo(() => {
    const critical = triageItems.filter(i => i.severity === 'critical').length;
    const warning  = triageItems.filter(i => i.severity === 'warning').length;
    const info     = triageItems.filter(i => i.severity === 'info').length;
    return { critical, warning, info };
  }, [triageItems]);

  const loading = dealersLoading || dashLoading;
  const error   = dealersError || dashError;
  const reload  = () => { reloadDealers(); reloadDash(); };

  if (loading) {
    return (
      <AdminShell back={{ href: '#/admin', label: 'Back to overview' }}>
        <div className="surface-card-operator p-6"><Skeleton rows={6} /></div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell back={{ href: '#/admin', label: 'Back to overview' }}>
        <ErrorState message={error} onRetry={reload} />
      </AdminShell>
    );
  }

  if (!dealer) {
    return (
      <AdminShell back={{ href: '#/admin', label: 'Back to overview' }}>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="text-4xl font-black text-silver-300 select-none">404</div>
          <h2 className="text-lg font-bold text-ink-heading">Dealer not found</h2>
          <p className="text-sm text-ink-muted max-w-sm">
            No dealer with ID{' '}
            <span className="font-mono bg-surface-inset border border-silver-200 px-1.5 py-0.5 rounded text-xs text-ink-heading">
              {dealerId}
            </span>{' '}
            exists in the system.
          </p>
          <a
            href="#/admin"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800 transition-colors"
          >
            ← Back to Admin Overview
          </a>
        </div>
      </AdminShell>
    );
  }

  const memberSince = new Date(dealer.createdAt).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  return (
    <AdminShell back={{ href: '#/admin', label: 'Back to overview' }}>

      {/* Identity card */}
      <div className="surface-card-operator p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-ink-heading">{dealer.legalName}</h2>
            {dealer.dbaName && dealer.dbaName !== dealer.legalName && (
              <p className="text-sm text-ink-muted">dba {dealer.dbaName}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border">
                {BUSINESS_CATEGORY_LABELS[dealer.businessCategory] ?? dealer.businessCategory}
              </span>
              <span className="text-xs text-ink-faint">Member since {memberSince}</span>
            </div>
            <div className="pt-1">
              <CopyableId value={dealer.id} />
            </div>
          </div>

          {/* Triage badge summary */}
          {triageItems.length > 0 && (
            <div className="flex flex-wrap gap-2 shrink-0">
              {triageCounts.critical > 0 && (
                <span className="px-2.5 py-1 rounded text-[10px] font-bold border bg-status-error-bg text-status-error-text border-status-error-border">
                  {triageCounts.critical} critical
                </span>
              )}
              {triageCounts.warning > 0 && (
                <span className="px-2.5 py-1 rounded text-[10px] font-bold border bg-status-warning-bg text-status-warning-text border-status-warning-border">
                  {triageCounts.warning} warning
                </span>
              )}
              {triageCounts.info > 0 && (
                <span className="px-2.5 py-1 rounded text-[10px] font-bold border bg-status-info-bg text-status-info-text border-status-info-border">
                  {triageCounts.info} info
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Platforms', href: `#/${dealer.id}/platforms`, desc: 'Connected channels' },
          { label: 'Inventory', href: `#/${dealer.id}/inventory`, desc: 'Vehicles & assets' },
          { label: 'Queue',     href: `#/${dealer.id}/queue`,     desc: 'Publish queue' },
          { label: 'History',   href: `#/${dealer.id}/history`,   desc: 'Sync history' },
          { label: 'Reports',   href: `#/${dealer.id}/reports`,   desc: 'Performance data' },
          { label: 'Help',      href: `#/${dealer.id}/help`,      desc: 'Knowledge base' },
        ].map(card => (
          <a
            key={card.label}
            href={card.href}
            className="surface-card-operator p-4 hover:border-silver-300 transition-all group"
          >
            <div className="text-sm font-semibold text-navy-700 group-hover:text-navy-600">{card.label}</div>
            <div className="text-xs text-ink-muted mt-0.5">{card.desc}</div>
          </a>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-silver-200 mb-6">
        <nav className="flex gap-1 -mb-px">
          {TAB_LIST.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-orange-600 text-ink-heading'
                  : 'border-transparent text-ink-muted hover:text-ink-heading'
              }`}
            >
              {t.label}
              {t.key === 'triage' && triageItems.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-status-error-bg text-status-error-text border border-status-error-border">
                  {triageItems.length}
                </span>
              )}
            </button>
          ))}
        </nav>
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
                  {BUSINESS_CATEGORY_LABELS[dealer.businessCategory] ?? dealer.businessCategory}
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
                      <div className="min-w-0">
                        <div className="text-sm text-ink-heading font-medium truncate">{item.reason}</div>
                        <div className="text-xs text-ink-muted mt-0.5 font-mono">{item.platformSlug}</div>
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
                  <p className="text-sm text-ink-heading">{item.reason}</p>
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
          <div className="py-4 space-y-2">
            <p className="text-sm text-ink-muted">
              Per-dealer blocked configuration filtering is not yet available from the API.
            </p>
            <p className="text-xs text-ink-faint">
              Phase 2: <code className="font-mono">getBlockedDealers</code> will accept a <code className="font-mono">dealerId</code> filter parameter.
              Until then, use the{' '}
              <a href="#/admin/blocked-dealers" className="text-navy-600 hover:text-navy-500 underline">
                Blocked Dealers
              </a>{' '}
              screen and search by dealer name.
            </p>
          </div>
        </SectionCard>
      )}

      {tab === 'audit' && (
        <SectionCard title="Audit Log">
          <div className="py-4 space-y-2">
            <p className="text-sm text-ink-muted">
              Per-dealer audit log filtering is not yet available from the API.
            </p>
            <p className="text-xs text-ink-faint">
              Phase 2: <code className="font-mono">AdminRecentEventItem</code> will include a <code className="font-mono">dealerId</code> field
              to enable per-dealer filtering. Until then, the full audit log is visible on the{' '}
              <a href="#/admin" className="text-navy-600 hover:text-navy-500 underline">
                Admin Overview
              </a>{' '}
              → Audit tab.
            </p>
          </div>
        </SectionCard>
      )}
    </AdminShell>
  );
}
