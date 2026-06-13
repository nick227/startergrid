import { Fragment, useMemo, useState, type FormEvent } from 'react';
import { BUSINESS_CATEGORY_IDS } from '@auto-dealer/category-schemas';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchBlockedDealers, type AdminBlockedDealerItem } from '@/lib/api/admin.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ErrorState } from '@/components/operator/index.ts';

const INPUT_CLS =
  'bg-surface-card border border-silver-300 rounded-md px-3 py-1.5 text-xs text-ink-heading ' +
  'placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-navy-500/30 transition-colors';

const SELECT_CLS =
  'bg-surface-card border border-silver-300 rounded-md px-3 py-1.5 text-xs text-ink-heading ' +
  'focus:outline-none focus:ring-2 focus:ring-navy-500/30 transition-colors cursor-pointer';

const CLEAR_CLS =
  'px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink-heading ' +
  'border border-silver-300 hover:border-silver-400 rounded-md transition-all';

const SEV_CFG: Record<string, { label: string; cls: string }> = {
  critical: { label: 'Critical', cls: 'bg-status-error-bg text-status-error-text border-status-error-border' },
  warning:  { label: 'Warning',  cls: 'bg-status-warning-bg text-status-warning-text border-status-warning-border' },
  info:     { label: 'Info',     cls: 'bg-status-info-bg text-status-info-text border-status-info-border' },
};
const SEV_DEFAULT = { label: 'Info', cls: 'bg-status-info-bg text-status-info-text border-status-info-border' };

const SOURCE_LABELS: Record<string, string> = {
  partner_setup: 'Partner Setup',
  dealer_partner_credentials: 'Partner Credentials',
  feed_validation: 'Feed Validation',
  geo_readiness: 'Rooftop Coordinates',
  developer_credentials: 'Developer Credentials',
};

const SOURCE_OPTIONS = [
  { value: 'partner_setup', label: 'Partner Setup' },
  { value: 'dealer_partner_credentials', label: 'Partner Credentials' },
  { value: 'feed_validation', label: 'Feed Validation' },
  { value: 'geo_readiness', label: 'Rooftop Coordinates' },
  { value: 'developer_credentials', label: 'Developer Credentials' },
];

const PLATFORMS_LIST = [
  { slug: 'facebook-dynamic-product-ads', name: 'Facebook DPA' },
  { slug: 'facebook-social-posting', name: 'Facebook Social' },
  { slug: 'google-dynamic-product-ads', name: 'Google DPA' },
  { slug: 'ebay-listings', name: 'eBay Listings' },
  { slug: 'instagram-social-posting', name: 'Instagram Social' },
  { slug: 'tiktok-catalog', name: 'TikTok Catalog' },
  { slug: 'tiktok-shop', name: 'TikTok Shop' },
  { slug: 'microsoft-catalog', name: 'Microsoft Catalog' },
  { slug: 'pinterest-catalog', name: 'Pinterest Catalog' },
  { slug: 'snapchat-catalog', name: 'Snapchat Catalog' },
  { slug: 'reddit-catalog', name: 'Reddit Catalog' },
  { slug: 'x-catalog', name: 'X Catalog' },
  { slug: 'x-social-posting', name: 'X Social' },
  { slug: 'nextdoor-catalog', name: 'Nextdoor Catalog' },
  { slug: 'linkedin-lead-sync', name: 'LinkedIn Lead Sync' },
  { slug: 'youtube-social-posting', name: 'YouTube Social' },
  { slug: 'google-business-posting', name: 'Google Business Social' },
  { slug: 'pinterest-social-posting', name: 'Pinterest Social' },
  { slug: 'cargurus-dealer', name: 'CarGurus Dealer' },
  { slug: 'autotrader-cox', name: 'Autotrader / Cox' },
  { slug: 'cars-com', name: 'Cars.com' },
  { slug: 'truecar-dealer-network', name: 'TrueCar' },
  { slug: 'carfax-for-dealers', name: 'CARFAX' },
  { slug: 'all', name: 'All Platforms' },
];

// ── View model ─────────────────────────────────────────────────────────────────

type ActionEntry = { label: string; href: string; highlight: boolean };

export type AdminTriageWorkItem = {
  id: string;
  dealerName: string;
  dealerHref?: string;
  dealerId: string;
  platformName: string;
  platformHref?: string;
  severity: string;
  blockerLabel: string;
  impactLabel: string;
  durationLabel: string;
  actions: ActionEntry[];
  technicalDetails: {
    source: string;
    status?: string | null;
    reason: string;
    nextAction?: string | null;
    platformSlug: string;
    affectedCount?: number | null;
  };
};

function formatDuration(firstSeenAt?: string | null): string {
  if (!firstSeenAt) return '—';
  const diffMs = Date.now() - new Date(firstSeenAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return '1y+';
}

function getBlockerLabel(source: string): string {
  const map: Record<string, string> = {
    partner_setup:               'Partner setup incomplete',
    dealer_partner_credentials:  'Missing partner credentials',
    feed_validation:             'Feed validation failed',
    geo_readiness:               'Missing rooftop coordinates',
    developer_credentials:       'Missing developer credentials',
  };
  return map[source] ?? 'Configuration required';
}

function getImpactLabel(item: AdminBlockedDealerItem): string {
  const { source, affectedCount } = item;
  if (source === 'geo_readiness') return 'Hidden from local search';
  if (source === 'feed_validation') {
    return affectedCount != null ? `${affectedCount} listings rejected` : 'Listings rejected';
  }
  if (affectedCount != null && affectedCount > 0) return `${affectedCount} vehicles held`;
  return 'Platform unavailable';
}

function getActions(item: AdminBlockedDealerItem): ActionEntry[] {
  const dealerUrl   = item.dealerHref   || `#/${item.dealerId}`;
  const platformUrl = item.platformHref || `#/${item.dealerId}/platforms/${item.platformSlug}`;

  switch (item.source) {
    case 'partner_setup':
      return [
        { label: 'Reconnect',   href: platformUrl, highlight: true  },
        { label: 'Edit dealer', href: dealerUrl,   highlight: false },
      ];
    case 'dealer_partner_credentials':
      return [
        { label: 'Add key',    href: platformUrl, highlight: true  },
        { label: 'Reconnect',  href: platformUrl, highlight: false },
      ];
    case 'feed_validation':
      return [
        { label: 'View errors', href: platformUrl, highlight: true  },
        { label: 'Retry',       href: platformUrl, highlight: false },
      ];
    case 'geo_readiness':
      return [
        { label: 'Edit dealer', href: dealerUrl, highlight: true },
      ];
    case 'developer_credentials':
      return [
        { label: 'Add key',     href: platformUrl, highlight: true  },
        { label: 'Edit dealer', href: dealerUrl,   highlight: false },
      ];
    default:
      return [
        { label: 'Open', href: dealerUrl, highlight: false },
      ];
  }
}

export function mapBlockedDealerToWorkItem(
  item: AdminBlockedDealerItem,
  index: number,
): AdminTriageWorkItem {
  return {
    id: item.id || `${item.dealerId}-${item.platformSlug}-${item.source}-${index}`,
    dealerName:   item.dealerName,
    dealerHref:   item.dealerHref,
    dealerId:     item.dealerId,
    platformName: item.platformName,
    platformHref: item.platformHref,
    severity:     item.severity,
    blockerLabel: getBlockerLabel(item.source),
    impactLabel:  getImpactLabel(item),
    durationLabel: formatDuration(item.firstSeenAt),
    actions:      getActions(item),
    technicalDetails: {
      source:        item.source,
      status:        item.status,
      reason:        item.reason,
      nextAction:    item.nextAction,
      platformSlug:  item.platformSlug,
      affectedCount: item.affectedCount,
    },
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ResultCount({ shown, total }: { shown: number; total: number }) {
  return (
    <p className="text-xs text-ink-faint">
      {shown === total ? `${total} items` : `${shown} of ${total} items`}
    </p>
  );
}

function DetailsRow({ item }: { item: AdminTriageWorkItem }) {
  const d = item.technicalDetails;
  return (
    <tr className="bg-surface-inset border-b border-silver-200">
      <td colSpan={7} className="px-4 py-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px]">
          <div>
            <span className="text-ink-faint uppercase tracking-wider font-semibold mr-1">Source</span>
            <span className="text-ink-muted">{SOURCE_LABELS[d.source] ?? d.source}</span>
          </div>
          {d.status && (
            <div>
              <span className="text-ink-faint uppercase tracking-wider font-semibold mr-1">Status</span>
              <span className="font-mono text-ink-muted">{d.status}</span>
            </div>
          )}
          {d.platformSlug !== 'all' && (
            <div>
              <span className="text-ink-faint uppercase tracking-wider font-semibold mr-1">Slug</span>
              <span className="font-mono text-ink-muted">{d.platformSlug}</span>
            </div>
          )}
          {d.affectedCount != null && (
            <div>
              <span className="text-ink-faint uppercase tracking-wider font-semibold mr-1">Affected</span>
              <span className="text-status-error-text font-semibold">{d.affectedCount}</span>
            </div>
          )}
          <div className="w-full">
            <span className="text-ink-faint uppercase tracking-wider font-semibold mr-1">Reason</span>
            <span className="text-ink-body">{d.reason}</span>
          </div>
          {d.nextAction && (
            <div className="w-full">
              <span className="text-ink-faint uppercase tracking-wider font-semibold mr-1">Next action</span>
              <span className="text-orange-600">{d.nextAction}</span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DealerTriagePanel() {
  const [severity, setSeverity]         = useState('');
  const [category, setCategory]         = useState('');
  const [platform, setPlatform]         = useState('');
  const [source, setSource]             = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [page, setPage]                 = useState(1);
  const [expanded, setExpanded]         = useState<Set<string>>(new Set());
  const limit = 20;

  const { data, loading, error, reload } = useAsyncQuery(
    () => fetchBlockedDealers({
      severity: severity || undefined,
      category: category || undefined,
      platform: platform || undefined,
      source:   source   || undefined,
      q:        searchQuery || undefined,
      page,
      limit,
    }),
    [severity, category, platform, source, searchQuery, page],
  );

  const workItems = useMemo(
    () => (data?.items ?? []).map((item, i) => mapBlockedDealerToWorkItem(item, i)),
    [data],
  );
  const pagination    = data?.pagination;
  const summary       = data?.summary;
  const meta          = data?.meta;
  const activeFilters = [severity, category, platform, source, searchQuery].filter(Boolean).length;

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setPage(1);
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function resetFilters() {
    setSeverity(''); setCategory(''); setPlatform(''); setSource('');
    setSearchInput(''); setSearchQuery(''); setPage(1);
  }

  function toggleDetails(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-faint">
            {summary.total} open issue{summary.total !== 1 ? 's' : ''}
          </span>
          {summary.critical > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-error-bg text-status-error-text border-status-error-border">
              {summary.critical} critical
            </span>
          )}
          {summary.warning > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-warning-bg text-status-warning-text border-status-warning-border">
              {summary.warning} warning
            </span>
          )}
          {summary.info > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-status-info-bg text-status-info-text border-status-info-border">
              {summary.info} info
            </span>
          )}
        </div>
      )}

      <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search dealer or reason..."
          className={`${INPUT_CLS} w-56`}
        />
        <button
          type="submit"
          className="px-3 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors"
        >
          Search
        </button>
        <select value={severity} onChange={e => changeFilter(setSeverity, e.target.value)} className={SELECT_CLS}>
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select value={category} onChange={e => changeFilter(setCategory, e.target.value)} className={SELECT_CLS}>
          <option value="">All Categories</option>
          {BUSINESS_CATEGORY_IDS.map(id => (
            <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={platform} onChange={e => changeFilter(setPlatform, e.target.value)} className={SELECT_CLS}>
          <option value="">All Platforms</option>
          {PLATFORMS_LIST.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
        <select value={source} onChange={e => changeFilter(setSource, e.target.value)} className={SELECT_CLS}>
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {activeFilters > 0 && (
          <button type="button" onClick={resetFilters} className={CLEAR_CLS}>
            Clear ({activeFilters})
          </button>
        )}
      </form>

      {loading && (
        <div className="surface-card-operator p-5"><Skeleton rows={8} /></div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <ResultCount shown={workItems.length} total={pagination?.total ?? workItems.length} />

          {workItems.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-silver-200 rounded-md text-ink-faint text-sm">
              All dealers are fully operational. No triage actions required.
            </div>
          ) : (
            <div className="surface-card-operator overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Dealer</th>
                    <th className="px-4 py-3 font-semibold">Platform</th>
                    <th className="px-4 py-3 font-semibold">Blocker</th>
                    <th className="px-4 py-3 font-semibold">Impact</th>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workItems.map(item => {
                    const sevCfg    = SEV_CFG[item.severity] ?? SEV_DEFAULT;
                    const isExpanded = expanded.has(item.id);
                    return (
                      <Fragment key={item.id}>
                        <tr
                          className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors"
                        >
                          <td className="px-4 py-3">
                            <a
                              href={item.dealerHref || `#/${item.dealerId}/platforms`}
                              className="font-semibold text-navy-700 hover:text-navy-600 hover:underline text-sm"
                            >
                              {item.dealerName}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-semibold text-ink-heading">{item.platformName}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-ink-body font-medium">{item.blockerLabel}</td>
                          <td className="px-4 py-3 text-xs text-ink-muted">{item.impactLabel}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-ink-muted tabular-nums">{item.durationLabel}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${sevCfg.cls}`}>
                              {sevCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.actions.map(action => (
                                <a
                                  key={action.label}
                                  href={action.href}
                                  className={
                                    action.highlight
                                      ? 'px-2.5 py-1 text-[10px] font-semibold text-orange-600 hover:text-orange-500 border border-orange-200 hover:border-orange-300 rounded transition-all'
                                      : 'px-2.5 py-1 text-[10px] font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded transition-all'
                                  }
                                >
                                  {action.label}
                                </a>
                              ))}
                              <button
                                type="button"
                                onClick={() => toggleDetails(item.id)}
                                className="px-2 py-1 text-[10px] text-ink-faint hover:text-ink-muted border border-silver-200 hover:border-silver-300 rounded transition-all"
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? '▲' : '▾'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && <DetailsRow item={item} />}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="surface-card-operator flex items-center justify-between p-4 text-xs">
              <div className="text-ink-muted">
                Page <span className="font-semibold text-ink-heading">{pagination.page}</span> of{' '}
                <span className="font-semibold text-ink-heading">{pagination.pages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-silver-300 rounded-md disabled:opacity-40 hover:border-silver-400 transition-all text-ink-muted hover:text-ink-heading"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page === pagination.pages}
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  className="px-3 py-1.5 border border-silver-300 rounded-md disabled:opacity-40 hover:border-silver-400 transition-all text-ink-muted hover:text-ink-heading"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {meta && (
            <div className="text-center text-[10px] text-ink-faint">
              Rendered at {new Date(meta.generatedAt).toLocaleString()}
              {meta.cached && (
                <span className="ml-1 inline-block px-1.5 py-0.5 rounded bg-surface-inset border border-silver-200">cached</span>
              )}
              {' '}· Query took {meta.durationMs}ms
            </div>
          )}
        </>
      )}
    </div>
  );
}
