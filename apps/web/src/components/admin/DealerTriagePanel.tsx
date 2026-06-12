import { useMemo, useState, type FormEvent } from 'react';
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

function ResultCount({ shown, total }: { shown: number; total: number }) {
  return (
    <p className="text-xs text-ink-faint">
      {shown === total ? `${total} items` : `${shown} of ${total} items`}
    </p>
  );
}

function formatLastSeen(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'N/A';
}

function issueKey(item: AdminBlockedDealerItem, index: number) {
  return item.id || `${item.dealerId}-${item.platformSlug}-${item.source}-${index}`;
}

export function DealerTriagePanel() {
  const [severity, setSeverity] = useState('');
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('');
  const [source, setSource] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, loading, error, reload } = useAsyncQuery(
    () => fetchBlockedDealers({
      severity: severity || undefined,
      category: category || undefined,
      platform: platform || undefined,
      source: source || undefined,
      q: searchQuery || undefined,
      page,
      limit,
    }),
    [severity, category, platform, source, searchQuery, page],
  );

  const items = useMemo(() => data?.items ?? [], [data]);
  const pagination = data?.pagination;
  const summary = data?.summary;
  const meta = data?.meta;
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
    setSeverity('');
    setCategory('');
    setPlatform('');
    setSource('');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
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
          <ResultCount shown={items.length} total={pagination?.total ?? items.length} />

          {items.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-silver-200 rounded-md text-ink-faint text-sm">
              All dealers are fully operational. No triage actions required.
            </div>
          ) : (
            <div className="surface-card-operator overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Dealer</th>
                    <th className="px-4 py-3 font-semibold">Platform</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Issue</th>
                    <th className="px-4 py-3 font-semibold">Next Action</th>
                    <th className="px-4 py-3 font-semibold">Last Seen</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const sevCfg = SEV_CFG[item.severity] ?? SEV_DEFAULT;
                    return (
                      <tr key={issueKey(item, index)} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors">
                        <td className="px-4 py-3">
                          <a href={item.dealerHref || `#/${item.dealerId}/platforms`} className="font-semibold text-navy-700 hover:text-navy-600 hover:underline text-sm">
                            {item.dealerName}
                          </a>
                          <div className="text-[10px] text-ink-faint mt-0.5">{item.category}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-semibold text-ink-heading">{item.platformName}</div>
                          <div className="text-[10px] text-ink-faint font-mono mt-0.5">{item.platformSlug}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${sevCfg.cls}`}>{sevCfg.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-inset text-ink-muted border border-silver-200">
                            {SOURCE_LABELS[item.source] || item.source}
                          </span>
                          {item.affectedCount !== null && item.affectedCount !== undefined && (
                            <div className="text-[10px] text-status-error-text font-semibold mt-1">
                              {item.affectedCount} affected
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-body max-w-xs">{item.reason}</td>
                        <td className="px-4 py-3 text-xs text-orange-600 font-medium max-w-[14rem]">{item.nextAction}</td>
                        <td className="px-4 py-3 text-[11px] text-ink-muted font-mono whitespace-nowrap">
                          {formatLastSeen(item.lastSeenAt)}
                          <div className="text-[10px] text-ink-faint mt-0.5">{item.status}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <a href={item.dealerHref || `#/${item.dealerId}/platforms`} className="px-2.5 py-1 text-[10px] font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded transition-all">
                              Dealer
                            </a>
                            {item.platformSlug !== 'all' && (
                              <a href={item.platformHref || `#/${item.dealerId}/platforms/${item.platformSlug}`} className="px-2.5 py-1 text-[10px] font-semibold text-orange-600 hover:text-orange-500 border border-orange-100 hover:border-orange-100 rounded transition-all">
                                Platform
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
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
