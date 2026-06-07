import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchSites } from '../lib/api.ts';
import { categorySiteHref } from '../lib/routes.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { SkeletonBlock } from '../components/ui/SkeletonBlock.tsx';

const STATUS_LABEL = {
  active: 'Browse listings',
  coming_soon: 'Coming soon',
  disabled: 'Unavailable',
} as const;

export default function SitesIndexPage() {
  const { data, loading, error, reload } = useQuery(() => fetchSites(), []);

  usePageMeta('Marketplaces', 'Choose a category marketplace to browse listings.');

  if (loading && !data) {
    return (
      <PageShell showCategoryNav={false}>
        <PageHeader title="Marketplaces" subtitle="Choose a category to browse." />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBlock key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell showCategoryNav={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={reload} />
      </PageShell>
    );
  }

  if (!data) return null;

  return (
    <PageShell showCategoryNav={false}>
      <PageHeader
        title="Marketplaces"
        subtitle="Each site is tailored to a business category. Automotive is live today; more categories are on the way."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.sites.map(site => {
          const isActive = site.status === 'active';
          const cardClass = isActive
            ? 'mp-card block p-5 transition hover:border-navy-500/40 hover:shadow-elevation-3'
            : 'mp-card block p-5 opacity-80';

          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink-heading">{site.label}</h2>
                <span className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
                  site.status === 'active'
                    ? 'bg-status-success-bg text-status-success-text'
                    : site.status === 'coming_soon'
                      ? 'bg-status-warning-bg text-status-warning-text'
                      : 'bg-silver-100 text-ink-muted'
                }`}>
                  {site.status === 'active' ? 'Live' : site.status === 'coming_soon' ? 'Coming soon' : 'Disabled'}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-muted">{site.tagline}</p>
              <p className="mt-4 text-sm font-medium text-ink-body">
                {isActive
                  ? `${site.listingCount.toLocaleString()} listing${site.listingCount === 1 ? '' : 's'}`
                  : STATUS_LABEL[site.status]}
              </p>
            </>
          );

          if (isActive || site.status === 'coming_soon') {
            return (
              <a
                key={site.slug}
                href={categorySiteHref(site.href)}
                className={`${cardClass} mp-focus`}
                aria-disabled={!isActive && site.status === 'coming_soon' ? true : undefined}
              >
                {inner}
              </a>
            );
          }

          return (
            <div key={site.slug} className={cardClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
