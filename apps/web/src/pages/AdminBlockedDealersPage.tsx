import { useState, useMemo } from 'react';
import { fetchBlockedDealers } from '@/lib/api/admin.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ErrorState } from '@/components/operator/index.ts';
import { severityToPill, type ReadinessSeverity } from '@/lib/setupReadiness.ts';

const SOURCE_LABELS: Record<string, string> = {
  partner_setup: 'Partner Setup',
  dealer_partner_credentials: 'Partner Credentials',
  feed_validation: 'Feed Validation',
  geo_readiness: 'Missing Rooftop Coordinates',
  developer_credentials: 'Invalid Platform Credentials',
};



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

const FIELD_CLS =
  'w-full bg-white border border-silver-200 rounded-lg px-3.5 py-2 text-sm text-ink-heading ' +
  'focus:outline-none focus:ring-2 focus:ring-navy-500/30 transition-colors shadow-sm';

const LABEL_CLS = 'text-sm font-medium text-ink-body';

export default function AdminBlockedDealersPage() {
  const [severity, setSeverity] = useState('');
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('');
  const [source, setSource] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

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
    [severity, category, platform, source, searchQuery, page]
  );

  const items = useMemo(() => data?.items ?? [], [data]);
  const pagination = useMemo(() => data?.pagination, [data]);
  const summary = useMemo(() => data?.summary, [data]);
  const meta = useMemo(() => data?.meta, [data]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSeverity('');
    setCategory('');
    setPlatform('');
    setSource('');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <>

      {/* Page title */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-ink-heading">Blocked Dealer Configurations</h2>
        <p className="text-sm text-ink-muted mt-1">
          Search, filter, and inspect blocked or attention-needed dealerships across sync, credentials, applications, and geocoding.
        </p>
      </div>

      {/* Summary counts */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="surface-card-operator p-4">
            <div className="text-2xl font-bold text-ink-heading font-mono">{summary.total}</div>
            <div className="text-xs text-ink-muted uppercase font-semibold mt-1">Total Issues</div>
          </div>
          <div className="surface-card-operator p-4 border-l-4 border-l-status-error-border">
            <div className="text-2xl font-bold text-status-error-text font-mono">{summary.critical}</div>
            <div className="text-xs text-status-error-text uppercase font-semibold mt-1">Critical Blocker</div>
          </div>
          <div className="surface-card-operator p-4 border-l-4 border-l-status-warning-border">
            <div className="text-2xl font-bold text-status-warning-text font-mono">{summary.warning}</div>
            <div className="text-xs text-status-warning-text uppercase font-semibold mt-1">Warning Signal</div>
          </div>
          <div className="surface-card-operator p-4 border-l-4 border-l-status-info-border">
            <div className="text-2xl font-bold text-status-info-text font-mono">{summary.info}</div>
            <div className="text-xs text-status-info-text uppercase font-semibold mt-1">Information</div>
          </div>
        </div>
      )}

      {/* Filters Block */}
      <div className="surface-card-operator p-5 mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

          <div className="md:col-span-3 flex flex-col gap-1.5">
            <label htmlFor="search" className={LABEL_CLS}>Search Dealer or Reason</label>
            <div className="flex gap-2">
              <input
                id="search"
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Type dealer name or reason..."
                className={FIELD_CLS}
              />
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 shrink-0"
              >
                Search
              </button>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="severity" className={LABEL_CLS}>Severity</label>
            <select
              id="severity"
              value={severity}
              onChange={e => handleFilterChange(setSeverity, e.target.value)}
              className={FIELD_CLS}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="category" className={LABEL_CLS}>Category</label>
            <select
              id="category"
              value={category}
              onChange={e => handleFilterChange(setCategory, e.target.value)}
              className={FIELD_CLS}
            >
              <option value="">All Categories</option>
              <option value="AUTOMOTIVE">Automotive</option>
              <option value="BOAT">Boats</option>
              <option value="TRAILER_RV_POWERSPORTS">Trailers/RV</option>
            </select>
          </div>

          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="platform" className={LABEL_CLS}>Platform</label>
            <select
              id="platform"
              value={platform}
              onChange={e => handleFilterChange(setPlatform, e.target.value)}
              className={FIELD_CLS}
            >
              <option value="">All Platforms</option>
              {PLATFORMS_LIST.map(p => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="source" className={LABEL_CLS}>Source</label>
            <select
              id="source"
              value={source}
              onChange={e => handleFilterChange(setSource, e.target.value)}
              className={FIELD_CLS}
            >
              <option value="">All Sources</option>
              <option value="application">Application</option>
              <option value="queue">Publish Queue</option>
              <option value="sync_run">Sync Run</option>
              <option value="sync_event">Sync Event</option>
              <option value="geo">Rooftop Geo</option>
              <option value="credentials">Credentials</option>
            </select>
          </div>

          <div className="md:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full px-2 py-2 border border-silver-300 hover:border-silver-400 text-ink-muted hover:text-ink-heading rounded-md text-sm font-semibold transition-all"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Content */}
      {loading && (
        <div className="surface-card-operator p-5">
          <Skeleton rows={8} />
        </div>
      )}

      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-silver-200 rounded-md text-ink-faint text-sm">
              No blocked dealer configurations found matching the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => {
                const isValidationSource = item.source === 'dealer_partner_credentials' || item.source === 'feed_validation';

                return (
                  <div
                    key={item.id}
                    className="surface-card-operator p-5 hover:border-silver-300 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    {/* Left: Blocker Summary */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${severityToPill(item.severity as ReadinessSeverity)}`}>
                          {item.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-silver-100 text-ink-muted">
                          {SOURCE_LABELS[item.source] || item.source}
                        </span>
                        {item.affectedCount && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700">
                            {item.affectedCount} items affected
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="text-base font-bold text-ink-heading">
                            {item.dealerName}
                          </h3>
                          <span className="text-xs text-ink-muted">
                            ({item.category})
                          </span>
                        </div>
                        <div className="text-xs text-ink-muted mt-1">
                          Platform:{' '}
                          <span className="font-mono text-navy-700 font-semibold">
                            {item.platformName} ({item.platformSlug})
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-ink-body">
                        {isValidationSource ? (
                          <div className="p-3 bg-red-50 text-red-800 rounded-md">
                            <span className="font-semibold text-xs block mb-1">Validation Failure</span>
                            {item.reason}
                          </div>
                        ) : (
                          item.reason
                        )}
                      </div>

                      <div className="text-sm text-orange-800 bg-orange-50 p-3 rounded-md max-w-2xl mt-3">
                        <span className="font-semibold">Next Action:</span> {item.nextAction}
                      </div>
                    </div>

                    {/* Right: Metadata & links */}
                    <div className="flex flex-col items-start md:items-end justify-between md:h-full gap-4 shrink-0 text-xs">
                      <div className="text-ink-muted text-left md:text-right space-y-1">
                        <div>
                          Status: <span className="font-mono text-ink-heading">{item.status}</span>
                        </div>
                        <div>
                          Last detected:{' '}
                          <span className="font-mono text-ink-muted">
                            {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={item.dealerHref}
                          className="px-3 py-1.5 bg-surface-inset hover:bg-silver-200 border border-silver-300 text-ink-muted hover:text-ink-heading rounded-md transition-all"
                        >
                          Dealer platforms
                        </a>
                        {item.platformSlug !== 'all' && (
                          <a
                            href={item.platformHref}
                            className="btn-primary-operator"
                          >
                            Inspect platform
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="surface-card-operator flex items-center justify-between p-4 text-xs">
                  <div className="text-ink-muted">
                    Showing page <span className="font-semibold text-ink-heading">{pagination.page}</span> of{' '}
                    <span className="font-semibold text-ink-heading">{pagination.pages}</span> (
                    <span className="font-semibold text-ink-heading">{pagination.total}</span> total results)
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
            </div>
          )}
        </>
      )}

      {meta && (
        <div className="mt-8 text-center text-[10px] text-ink-faint">
          Rendered at {new Date(meta.generatedAt).toLocaleString()}{' '}
          {meta.cached && (
            <span className="ml-1 inline-block px-1.5 py-0.5 rounded bg-surface-inset border border-silver-200">cached</span>
          )}{' '}
          · Query took {meta.durationMs}ms
        </div>
      )}
    </>
  );
}
