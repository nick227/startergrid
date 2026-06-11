import { useCallback, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ErrorState, SectionCard } from '@/components/operator/index.ts';
import { adminDealerHash } from '@/lib/routes.ts';
import { DealerDashboard } from '@/components/dashboard';

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminTab = 'system' | 'dealers' | 'platforms' | 'triage' | 'audit' | 'insights';
type SortDir = 'asc' | 'desc';
type DealerSortField = 'legalName' | 'businessCategory' | 'createdAt' | 'issues';
type PlatSortField   = 'platformName' | 'dealersUsing' | 'maturity';
type TriageSortField = 'severity' | 'dealerName' | 'platformSlug';

// ── Shared form-element class strings ────────────────────────────────────────

const INPUT_CLS =
  'bg-surface-card border border-silver-300 rounded-md px-3 py-1.5 text-xs text-ink-heading ' +
  'placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-navy-500/30 transition-colors';

const SELECT_CLS =
  'bg-surface-card border border-silver-300 rounded-md px-3 py-1.5 text-xs text-ink-heading ' +
  'focus:outline-none focus:ring-2 focus:ring-navy-500/30 transition-colors cursor-pointer';

const CLEAR_CLS =
  'px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink-heading ' +
  'border border-silver-300 hover:border-silver-400 rounded-md transition-all';

// ── Lookup tables ─────────────────────────────────────────────────────────────

const SEV_ORDER: Record<string, number>     = { critical: 0, warning: 1, info: 2 };
const MATURITY_ORDER: Record<string, number> = { PRODUCTION_READY: 0, BETA: 1, ALPHA: 2 };

function formatDuration(sec: number | null): string {
  if (sec === null) return 'N/A';
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

const HEALTH_CFG: Record<string, { label: string; cls: string }> = {
  healthy:   { label: 'Healthy',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  flowing:   { label: 'Flowing',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  valid:     { label: 'Valid',      cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  backed_up: { label: 'Backed Up', cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  invalid:   { label: 'Invalid',   cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  unhealthy: { label: 'Unhealthy', cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  unknown:   { label: 'Not Checked', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
};
const HEALTH_DEFAULT = { label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' };

const READINESS_CFG: Record<string, { label: string; cls: string }> = {
  valid:   { label: 'Pass',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  PASS:    { label: 'Pass',    cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  WARNING: { label: 'Warning', cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  UNKNOWN: { label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
  invalid: { label: 'Fail',   cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
};
const READINESS_DEFAULT = { label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' };

const VALIDATION_CFG: Record<string, { label: string; cls: string }> = {
  valid:            { label: 'Valid',          cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  invalid:          { label: 'Invalid',        cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  'not-configured': { label: 'Not Configured', cls: 'bg-surface-inset text-ink-faint border-silver-200' },
  unsupported:      { label: 'No Live Check',  cls: 'bg-surface-inset text-ink-faint border-silver-200' },
};
const VALIDATION_DEFAULT = { label: 'Not Checked', cls: 'bg-surface-inset text-ink-faint border-silver-200' };

const SEV_CFG: Record<string, { label: string; cls: string }> = {
  critical: { label: 'Critical', cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  warning:  { label: 'Warning',  cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  info:     { label: 'Info',     cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
};
const SEV_DEFAULT = { label: 'Info', cls: 'bg-status-info-bg text-status-info-text border-status-info-border' };

const CAP_CLS = 'bg-surface-inset text-ink-muted border border-silver-200';

const MATURITY_CFG: Record<string, { label: string; cls: string }> = {
  PRODUCTION_READY: { label: 'Production Ready', cls: 'bg-status-success-bg text-status-success-text border-status-success-border' },
  BETA:             { label: 'Beta',              cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
  ALPHA:            { label: 'Alpha',             cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' },
};
const MATURITY_DEFAULT = { label: 'Unknown', cls: 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border' };

// ── Reusable sortable column header ──────────────────────────────────────────

function SortTh({
  isActive,
  dir,
  onClick,
  children,
  className = '',
}: {
  isActive: boolean;
  dir: SortDir;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 whitespace-nowrap hover:text-ink-heading transition-colors"
      >
        {children}
        <span className={`text-[9px] ${isActive ? 'text-orange-600' : 'text-silver-300'}`}>
          {isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

// ── Results count line ────────────────────────────────────────────────────────

function ResultCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <p className="text-xs text-ink-faint">
      {shown === total
        ? `${total} ${noun}${total !== 1 ? 's' : ''}`
        : `${shown} of ${total} ${noun}${total !== 1 ? 's' : ''}`}
    </p>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

type Props = {
  activeTab: string;
  data: any;
  loading: boolean;
  error: string | null;
  dealersData: any;
  dealersLoading: boolean;
  dealersError: string | null;
};

export default function AdminOverviewPage({
  activeTab,
  data,
  loading,
  error,
  dealersData,
  dealersLoading,
  dealersError,
}: Props) {
  const tab = activeTab;

  // Dealers tab
  const [dealerSearch, setDealerSearch]           = useState('');
  const [dealerCategory, setDealerCategory]       = useState('');
  const [dealerSort, setDealerSort]               = useState<DealerSortField>('legalName');
  const [dealerDir, setDealerDir]                 = useState<SortDir>('asc');

  // Platforms tab
  const [platSearch, setPlatSearch]               = useState('');
  const [platCap, setPlatCap]                     = useState('');
  const [platValidation, setPlatValidation]       = useState('');
  const [platMaturity, setPlatMaturity]           = useState('');
  const [platSort, setPlatSort]                   = useState<PlatSortField>('platformName');
  const [platDir, setPlatDir]                     = useState<SortDir>('asc');

  // Triage tab
  const [triageSearch, setTriageSearch]           = useState('');
  const [triageSev, setTriageSev]                 = useState('');
  const [triageSort, setTriageSort]               = useState<TriageSortField>('severity');
  const [triageDir, setTriageDir]                 = useState<SortDir>('asc');

  // Audit tab
  const [auditSearch, setAuditSearch]             = useState('');
  const [auditDir, setAuditDir]                   = useState<SortDir>('desc');

  // Dashboard shape
  const health          = useMemo(() => data?.health, [data]);
  const readiness       = useMemo(() => data?.readiness, [data]);
  const queueSnapshot   = useMemo(() => data?.queueSnapshot, [data]);
  const platformOverview = useMemo(() => data?.platformOverview ?? [], [data]);
  const dealerAttention  = useMemo(() => data?.dealerAttention ?? [], [data]);
  const recentEvents     = useMemo(() => data?.recentEvents ?? [], [data]);
  const meta            = useMemo(() => data?.meta, [data]);

  const allDealers = useMemo(() => dealersData?.dealers ?? [], [dealersData]);

  // Triage map: dealerId → { critical, warning, info }
  const triageByDealer = useMemo(() => {
    const m: Record<string, { critical: number; warning: number; info: number }> = {};
    for (const item of dealerAttention) {
      if (!m[item.dealerId]) m[item.dealerId] = { critical: 0, warning: 0, info: 0 };
      const s = item.severity as 'critical' | 'warning' | 'info';
      if (s in m[item.dealerId]) m[item.dealerId][s]++;
    }
    return m;
  }, [dealerAttention]);

  const dealerIssueWeight = useCallback((id: string) => {
    const t = triageByDealer[id];
    return t ? t.critical * 100 + t.warning * 10 + t.info : 0;
  }, [triageByDealer]);

  const dealerCategories = useMemo(
    () => [...new Set(allDealers.map(d => d.businessCategory))].sort(),
    [allDealers],
  );

  // ── Filtered & sorted lists ────────────────────────────────────────────────

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
      if (dealerSort === 'legalName')       cmp = a.legalName.localeCompare(b.legalName);
      else if (dealerSort === 'businessCategory') cmp = a.businessCategory.localeCompare(b.businessCategory);
      else if (dealerSort === 'createdAt')  cmp = a.createdAt.localeCompare(b.createdAt);
      else if (dealerSort === 'issues')     cmp = dealerIssueWeight(a.id) - dealerIssueWeight(b.id);
      return dealerDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allDealers, dealerSearch, dealerCategory, dealerSort, dealerDir, dealerIssueWeight]);

  const filteredPlatforms = useMemo(() => {
    let list = [...platformOverview];
    if (platSearch) {
      const q = platSearch.toLowerCase();
      list = list.filter(p =>
        p.platformName.toLowerCase().includes(q) ||
        p.platformSlug.toLowerCase().includes(q),
      );
    }
    if (platCap)       list = list.filter(p => p.capabilities.includes(platCap));
    if (platValidation) list = list.filter(p => p.liveValidationStatus === platValidation);
    if (platMaturity)  list = list.filter(p => p.integrationMaturity === platMaturity);
    list.sort((a, b) => {
      let cmp = 0;
      if (platSort === 'platformName')  cmp = a.platformName.localeCompare(b.platformName);
      else if (platSort === 'dealersUsing') cmp = a.dealersUsing - b.dealersUsing;
      else if (platSort === 'maturity') cmp = (MATURITY_ORDER[a.integrationMaturity ?? ''] ?? 3) - (MATURITY_ORDER[b.integrationMaturity ?? ''] ?? 3);
      return platDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [platformOverview, platSearch, platCap, platValidation, platMaturity, platSort, platDir]);

  const filteredTriage = useMemo(() => {
    let list = [...dealerAttention];
    if (triageSearch) {
      const q = triageSearch.toLowerCase();
      list = list.filter(item =>
        item.dealerName.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        item.platformSlug.toLowerCase().includes(q),
      );
    }
    if (triageSev) list = list.filter(d => d.severity === triageSev);
    list.sort((a, b) => {
      let cmp = 0;
      if (triageSort === 'severity')      cmp = (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3);
      else if (triageSort === 'dealerName')  cmp = a.dealerName.localeCompare(b.dealerName);
      else if (triageSort === 'platformSlug') cmp = a.platformSlug.localeCompare(b.platformSlug);
      return triageDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [dealerAttention, triageSearch, triageSev, triageSort, triageDir]);

  const filteredAudit = useMemo(() => {
    let list = [...recentEvents];
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      list = list.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.actorEmail.toLowerCase().includes(q) ||
        (e.detailString?.toLowerCase().includes(q) ?? false),
      );
    }
    list.sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return auditDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [recentEvents, auditSearch, auditDir]);

  // ── Sort togglers ─────────────────────────────────────────────────────────

  function toggleDealer(f: DealerSortField) {
    if (dealerSort === f) setDealerDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setDealerSort(f); setDealerDir('asc'); }
  }
  function togglePlat(f: PlatSortField) {
    if (platSort === f) setPlatDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setPlatSort(f); setPlatDir('asc'); }
  }
  function toggleTriage(f: TriageSortField) {
    if (triageSort === f) setTriageDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setTriageSort(f); setTriageDir('asc'); }
  }
  function toggleAudit() {
    setAuditDir(d => (d === 'asc' ? 'desc' : 'asc'));
  }

  // ── Derived counts ────────────────────────────────────────────────────────

  const criticalCount      = useMemo(() => dealerAttention.filter(d => d.severity === 'critical').length, [dealerAttention]);
  const dealerActiveFilters = [dealerSearch, dealerCategory].filter(Boolean).length;
  const platActiveFilters   = [platSearch, platCap, platValidation, platMaturity].filter(Boolean).length;
  const triageActiveFilters = [triageSearch, triageSev].filter(Boolean).length;
  const auditActiveFilters  = [auditSearch].filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {loading && !data && (
        <div className="surface-card-operator p-6"><Skeleton rows={12} /></div>
      )}
      {error && <ErrorState message={error} />}

      {!loading && !error && data && (
        <>

          {/* ── System Status Tab ─────────────────────────────────────────── */}
          {tab === 'system' && (
            <div className="space-y-5">

              <SectionCard
                title="Health"
                subtitle="Live status of core infrastructure components powering this portal instance."
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'API Gateway',       value: 'healthy',                       hint: 'Request routing layer' },
                    { label: 'Database',          value: health?.db,                       hint: 'Primary data store' },
                    { label: 'Queue Flow',        value: health?.queue,                    hint: 'Sync and publish pipeline' },
                    { label: 'Credentials Cache', value: health?.credentials ?? 'unknown', hint: 'Platform API key store' },
                  ].map(item => {
                    const cfg = HEALTH_CFG[item.value ?? ''] ?? HEALTH_DEFAULT;
                    return (
                      <div key={item.label} className="bg-surface-inset border border-silver-200 rounded-md p-4">
                        <div className="text-xs font-semibold text-ink-heading mb-0.5">{item.label}</div>
                        <div className="text-[10px] text-ink-faint mb-2">{item.hint}</div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title="Publish Queue"
                subtitle="Current state of the sync and publish pipeline. Failed and held items require manual review."
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Pending',               value: queueSnapshot?.pending,  color: 'text-ink-heading' },
                    { label: 'Retrying',              value: queueSnapshot?.retrying, color: 'text-status-warning-text' },
                    { label: 'Failed',                value: queueSnapshot?.failed,   color: 'text-status-error-text' },
                    { label: 'Held / Needs Approval', value: queueSnapshot?.held,     color: 'text-navy-700' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-surface-inset border border-silver-200 rounded-md p-4">
                      <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value ?? '—'}</div>
                      <div className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="px-4 py-3 bg-surface-inset border border-silver-200 rounded-md flex justify-between text-xs">
                    <span className="text-ink-muted">Oldest Pending Age</span>
                    <span className="font-mono text-ink-heading">{formatDuration(queueSnapshot?.oldestPendingAgeSec ?? null)}</span>
                  </div>
                  <div className="px-4 py-3 bg-surface-inset border border-silver-200 rounded-md flex justify-between text-xs">
                    <span className="text-ink-muted">Last Successful Sync</span>
                    <span className="font-mono text-ink-heading">
                      {queueSnapshot?.lastSuccessSyncAt
                        ? new Date(queueSnapshot.lastSuccessSyncAt).toLocaleTimeString()
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Readiness Checklist"
                subtitle="Pre-flight validation across core subsystems. All checks should pass before onboarding new dealers."
                noPadding
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                        <th className="px-4 py-3 text-left font-semibold">Subsystem</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">What it checks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Platform Registry', value: readiness?.platformRegistry, desc: 'All known platforms are registered and resolvable by slug.' },
                        { label: 'Sync Bridges',      value: readiness?.bridges,          desc: 'Catalog and social sync bridge adapters are initialized.' },
                        { label: 'OAuth Clients',     value: readiness?.oauthClients,     desc: 'OAuth provider client configurations are loaded and valid.' },
                        { label: 'Category Schemas',  value: readiness?.categorySchemas,  desc: 'Vehicle category field schemas are defined and consistent.' },
                        { label: 'Geo Coordinates',   value: readiness?.geoCoordinates,   desc: 'Rooftop geocoordinates are available for at least one dealer.' },
                        { label: 'Marketplace Smoke', value: readiness?.smokeMarketplace, desc: 'Marketplace listing data pathway responds successfully.' },
                        { label: 'Operator Smoke',    value: readiness?.smokeOperator,    desc: 'Operator console data path is accessible and returns results.' },
                      ].map(check => {
                        const cfg = READINESS_CFG[check.value ?? ''] ?? READINESS_DEFAULT;
                        return (
                          <tr key={check.label} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                            <td className="px-4 py-3 text-sm text-ink-heading font-medium">{check.label}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.cls}`}>
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-ink-faint hidden md:table-cell">{check.desc}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

            </div>
          )}

          {/* ── Dealerships Tab ────────────────────────────────────────────── */}
          {tab === 'dealers' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">
                All registered dealerships. Click a dealer name to open the admin management screen.
                Issue badges are sourced from the system health scan.
              </p>

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
                          <SortTh isActive={dealerSort === 'legalName'}       dir={dealerDir} onClick={() => toggleDealer('legalName')}>Dealership</SortTh>
                          <SortTh isActive={dealerSort === 'businessCategory'} dir={dealerDir} onClick={() => toggleDealer('businessCategory')}>Category</SortTh>
                          <SortTh isActive={dealerSort === 'createdAt'}       dir={dealerDir} onClick={() => toggleDealer('createdAt')}>Member Since</SortTh>
                          <SortTh isActive={dealerSort === 'issues'}          dir={dealerDir} onClick={() => toggleDealer('issues')}>Open Issues</SortTh>
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
          )}

          {/* ── Platforms Tab ──────────────────────────────────────────────── */}
          {tab === 'platforms' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">
                All registered advertising and distribution integrations. Click a platform name to manage its API credentials.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={platSearch}
                  onChange={e => setPlatSearch(e.target.value)}
                  placeholder="Search platforms…"
                  className={`${INPUT_CLS} w-44`}
                />
                <select value={platCap} onChange={e => setPlatCap(e.target.value)} className={SELECT_CLS}>
                  <option value="">All Capabilities</option>
                  <option value="catalogSync">Catalog Sync</option>
                  <option value="socialPosting">Social Posting</option>
                  <option value="marketplaceListing">Marketplace Listing</option>
                  <option value="partnerFeed">Partner Feed</option>
                  <option value="leadCapture">Lead Capture</option>
                </select>
                <select value={platValidation} onChange={e => setPlatValidation(e.target.value)} className={SELECT_CLS}>
                  <option value="">All Validation States</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="not-configured">Not Configured</option>
                  <option value="unsupported">No Live Check</option>
                </select>
                <select value={platMaturity} onChange={e => setPlatMaturity(e.target.value)} className={SELECT_CLS}>
                  <option value="">All Maturities</option>
                  <option value="PRODUCTION_READY">Production Ready</option>
                  <option value="BETA">Beta</option>
                  <option value="ALPHA">Alpha</option>
                </select>
                {platActiveFilters > 0 && (
                  <button type="button" onClick={() => { setPlatSearch(''); setPlatCap(''); setPlatValidation(''); setPlatMaturity(''); }} className={CLEAR_CLS}>
                    Clear ({platActiveFilters})
                  </button>
                )}
                <div className="ml-auto flex items-center gap-3 text-xs">
                  {filteredPlatforms.filter(p => p.liveValidationStatus === 'invalid').length > 0 && (
                    <span className="text-status-error-text">{filteredPlatforms.filter(p => p.liveValidationStatus === 'invalid').length} validation errors</span>
                  )}
                </div>
              </div>

              <ResultCount shown={filteredPlatforms.length} total={platformOverview.length} noun="platform" />

              <div className="surface-card-operator overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                      <SortTh isActive={platSort === 'platformName'}  dir={platDir} onClick={() => togglePlat('platformName')}>Platform</SortTh>
                      <th className="px-4 py-3 font-semibold">Validation</th>
                      <th className="px-4 py-3 font-semibold">Capabilities</th>
                      <SortTh isActive={platSort === 'dealersUsing'} dir={platDir} onClick={() => togglePlat('dealersUsing')}>Dealers</SortTh>
                      <SortTh isActive={platSort === 'maturity'}     dir={platDir} onClick={() => togglePlat('maturity')}>Maturity</SortTh>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlatforms.map(p => {
                      const valCfg = VALIDATION_CFG[p.liveValidationStatus ?? ''] ?? VALIDATION_DEFAULT;
                      const matCfg = MATURITY_CFG[p.integrationMaturity ?? ''] ?? MATURITY_DEFAULT;
                      return (
                        <tr key={p.platformSlug} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                          <td className="px-4 py-3">
                            <a href="#/admin/platform-credentials" className="font-semibold text-navy-700 hover:text-navy-600 hover:underline text-sm">
                              {p.platformName}
                            </a>
                            <div className="text-[10px] text-ink-faint font-mono mt-0.5">
                              {p.platformSlug}
                              {!p.configured && <span className="ml-1.5 text-ink-faint">· not configured</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${valCfg.cls}`}>{valCfg.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {p.capabilities.map(cap => (
                                <span key={cap} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${CAP_CLS}`}>
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-ink-heading text-sm">{p.dealersUsing}</span>
                            {p.blockedDealers > 0 && <div className="text-[10px] text-status-error-text font-semibold mt-0.5">{p.blockedDealers} blocked</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${matCfg.cls}`}>{matCfg.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPlatforms.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-faint text-sm">No platforms match the selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Dealer Triage Tab ──────────────────────────────────────────── */}
          {tab === 'triage' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-ink-muted">
                  Dealer configurations flagged for attention — blocked syncs, invalid credentials, missing geocoordinates, and stalled queues.
                </p>
                <a href="#/admin/blocked-dealers" className="text-xs font-semibold text-orange-600 hover:text-orange-500 hover:underline shrink-0">
                  Full blocked list →
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={triageSearch}
                  onChange={e => setTriageSearch(e.target.value)}
                  placeholder="Search dealer, platform, reason…"
                  className={`${INPUT_CLS} w-56`}
                />
                <select value={triageSev} onChange={e => setTriageSev(e.target.value)} className={SELECT_CLS}>
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
                {triageActiveFilters > 0 && (
                  <button type="button" onClick={() => { setTriageSearch(''); setTriageSev(''); }} className={CLEAR_CLS}>
                    Clear ({triageActiveFilters})
                  </button>
                )}
                {criticalCount > 0 && (
                  <span className="ml-auto text-xs text-status-error-text">{criticalCount} critical</span>
                )}
              </div>

              <ResultCount shown={filteredTriage.length} total={dealerAttention.length} noun="item" />

              {filteredTriage.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-silver-200 rounded-md text-ink-faint text-sm">
                  All dealers are fully operational — no triage actions required.
                </div>
              ) : (
                <div className="surface-card-operator overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[720px]">
                    <thead>
                      <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                        <SortTh isActive={triageSort === 'dealerName'}   dir={triageDir} onClick={() => toggleTriage('dealerName')}>Dealer</SortTh>
                        <SortTh isActive={triageSort === 'platformSlug'} dir={triageDir} onClick={() => toggleTriage('platformSlug')}>Platform</SortTh>
                        <SortTh isActive={triageSort === 'severity'}     dir={triageDir} onClick={() => toggleTriage('severity')}>Severity</SortTh>
                        <th className="px-4 py-3 font-semibold">Issue</th>
                        <th className="px-4 py-3 font-semibold">Next Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTriage.map((item, idx) => {
                        const sevCfg = SEV_CFG[item.severity] ?? SEV_DEFAULT;
                        return (
                          <tr key={idx} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                            <td className="px-4 py-3">
                              <a href={`#/${item.dealerId}/platforms`} className="font-semibold text-navy-700 hover:text-navy-600 hover:underline text-sm">
                                {item.dealerName}
                              </a>
                              <div className="text-[10px] text-ink-faint mt-0.5">{item.category}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-ink-muted">{item.platformSlug}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${sevCfg.cls}`}>{sevCfg.label}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-ink-body max-w-xs">{item.reason}</td>
                            <td className="px-4 py-3 text-xs text-orange-600 font-medium">{item.nextAction}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Audit Log Tab ──────────────────────────────────────────────── */}
          {tab === 'audit' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">
                Recent operator and system events recorded for security and compliance review. Actions are attributed to the authenticated actor at the time of the event.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  placeholder="Search action, actor, or details…"
                  className={`${INPUT_CLS} w-60`}
                />
                {auditActiveFilters > 0 && (
                  <button type="button" onClick={() => setAuditSearch('')} className={CLEAR_CLS}>
                    Clear
                  </button>
                )}
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => toggleAudit()}
                    className="px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded-md transition-all"
                  >
                    {auditDir === 'desc' ? 'Newest first ↓' : 'Oldest first ↑'}
                  </button>
                </div>
              </div>

              <ResultCount shown={filteredAudit.length} total={recentEvents.length} noun="event" />

              {filteredAudit.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-silver-200 rounded-md text-ink-faint text-sm">
                  No events match the search criteria.
                </div>
              ) : (
                <div className="surface-card-operator overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                        <SortTh isActive={true} dir={auditDir} onClick={() => toggleAudit()} className="whitespace-nowrap">Timestamp</SortTh>
                        <th className="px-4 py-3 font-semibold">Action</th>
                        <th className="px-4 py-3 font-semibold">Actor</th>
                        <th className="px-4 py-3 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAudit.map(event => (
                        <tr key={event.id} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors align-top">
                          <td className="px-4 py-3 font-mono text-[10px] text-ink-faint whitespace-nowrap">
                            {new Date(event.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-ink-heading">{event.action}</td>
                          <td className="px-4 py-3 text-xs text-ink-muted">{event.actorEmail}</td>
                          <td className="px-4 py-3 text-[10px] text-ink-faint font-mono max-w-xs break-words leading-relaxed">
                            {event.detailString || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Insights Tab ────────────────────────────────────────────────── */}
          {tab === 'insights' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted mb-4">
                Global aggregate sales and performance insights across all dealerships.
              </p>
              <DealerDashboard 
                isAdmin={true} 
                nav={{
                  goToHome: () => { window.location.hash = '#/admin' },
                  goToPlatforms: () => { window.location.hash = '#/admin/platforms' },
                  goToQueue: () => {},
                  goToHistory: () => {},
                  goToReports: () => { window.location.hash = '#/admin/dealers' },
                  goToInventory: () => { window.location.hash = '#/admin/dealers' },
                  goToLeads: () => { window.location.hash = '#/admin/dealers' },
                  goToHelp: () => { window.location.hash = '#/admin/dealers' },
                  goToPlatformDetail: () => { window.location.hash = '#/admin/platforms' },
                  goToPlatformQueue: () => {},
                  goToPlatformHistory: () => {},
                  goToSync: () => {},
                  goToAccounts: () => {},
                  goToInsights: () => { window.location.hash = '#/admin/insights' },
                  goToKnowledge: () => {},
                  changeDealer: () => { window.location.hash = '#/admin/dealers' },
                } as OperatorNavHandlers} 
              />
            </div>
          )}

        </>
      )}
    </>
  );
}
