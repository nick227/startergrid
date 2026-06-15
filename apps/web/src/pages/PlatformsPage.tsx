import { useMemo, useState, useEffect } from 'react';
import { fetchPublishStatus, fetchAccounts, fetchPlatformPerformance, fetchSelectedSocialPages, fetchPublishQueue } from '@/lib/api/sdk.ts';
import type { PlatformAccountDetail, PlatformPerformanceItem, PlatformPublishResult, SelectedSocialPage } from '@/lib/types.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { OperatorPage, ErrorState, InlineCallout } from '@/components/operator';
import { PageSituation } from '@/components/layout';
import { FilterChips } from '@/components/generic';
import { PlatformChannelList } from '@/components/platforms/PlatformChannelList.tsx';
import { OAuthConnectBanner } from '@/components/platforms/OAuthConnectBanner.tsx';
import { PlatformLogo } from '@/components/platforms/PlatformLogo.tsx';
import { Button } from '@/components/ui/Button.tsx';
import {
  PLATFORM_CONNECTION_FILTERS,
  platformMatchesFilter,
  platformSituationSummary,
  sortPlatformsForDisplay,
  type PlatformConnectionFilter,
} from '@/lib/platformPresentation.ts';
import { getSetupReadiness, severityToPill } from '@/lib/setupReadiness.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { PlatformConnectBanner } from '@/components/platforms/PlatformConnectBanner.tsx';
import { platformStatsBySlug } from '@/lib/platformQueueStats.ts';
import {
  AUTO_MARKETPLACE_NAME,
  AUTO_MARKETPLACE_SLUG,
  hideFromPlatformsChannelList,
  platformDisplayName,
} from '@/lib/marketplaceBrand.ts';

const MARKETPLACE_URL = (import.meta.env['VITE_MARKETPLACE_URL'] as string | undefined) ?? 'http://localhost:5174';

type Props = OperatorPageBaseProps & {
  initialPlatformSlug?: string | null;
};

function FeaturedMarketplaceSection({
  platform,
  account,
  dealerId,
  categorySlug,
  nav,
}: {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
  dealerId: string;
  categorySlug: string;
  nav: OperatorNavHandlers;
}) {
  const readiness = getSetupReadiness(platform, account);
  const sellerUrl = `${MARKETPLACE_URL}#/${categorySlug}/seller/${encodeURIComponent(dealerId)}`;

  return (
    <section className="pb-4">
      <article className="surface-card-operator p-4 ring-1 ring-navy-500/20">
        <div className="flex gap-3 items-start">
          <div className="pt-0.5 shrink-0">
            <PlatformLogo slug={platform.platformSlug} name={AUTO_MARKETPLACE_NAME} />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-0.5">In-house marketplace</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => nav.goToPlatformDetail(platform.platformSlug)}
                    className="text-sm font-semibold text-ink-heading hover:text-orange-600 hover:underline text-left"
                  >
                    {platformDisplayName(platform.platformSlug, platform.platformName)}
                  </button>
                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold border ${severityToPill(readiness.severity)}`}>
                    {readiness.statusLabel}
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <a
                  href={sellerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md text-ink-muted hover:text-ink-heading transition-colors whitespace-nowrap"
                >
                  View storefront →
                </a>
                <Button
                  size="sm"
                  variant="secondary"
                  className="whitespace-nowrap"
                  onClick={() => nav.goToPlatformDetail(platform.platformSlug)}
                >
                  Manage →
                </Button>
              </div>
            </div>
            <p className="text-xs text-ink-muted leading-snug">
              Your first-party storefront — inventory published here is live in the public marketplace immediately.
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}

export default function PlatformsPage({ dealerId, nav, activeTab, initialPlatformSlug }: Props) {
  const categorySchema = useCategorySchema();
  const { data, loading, error, reload, lastRefresh } = useAsyncQuery(
    () => fetchPublishStatus(dealerId),
    [dealerId]
  );
  const accountsQuery = useAsyncQuery(() => fetchAccounts(dealerId), [dealerId]);
  const perfQuery = useAsyncQuery(() => fetchPlatformPerformance(dealerId), [dealerId]);
  const socialPagesQuery = useAsyncQuery(() => fetchSelectedSocialPages(dealerId), [dealerId]);
  const queueQuery = useAsyncQuery(() => fetchPublishQueue(dealerId), [dealerId]);

  const [filter, setFilter] = useState<PlatformConnectionFilter>('ALL');
  const [sort] = useState<'urgency' | 'name'>('urgency');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialPlatformSlug ?? null);
  const [connectedSlug, setConnectedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlatformSlug) setSelectedSlug(initialPlatformSlug);
  }, [initialPlatformSlug]);

  const accountBySlug = useMemo(() => {
    const m = new Map<string, PlatformAccountDetail>();
    for (const a of accountsQuery.data?.accounts ?? []) m.set(a.platformSlug, a);
    return m;
  }, [accountsQuery.data]);

  const perfBySlug = useMemo(() => {
    const m = new Map<string, PlatformPerformanceItem>();
    for (const p of perfQuery.data?.platforms ?? []) m.set(p.platformSlug, p);
    return m;
  }, [perfQuery.data]);

  const socialPageBySlug = useMemo(() => {
    const m = new Map<string, SelectedSocialPage>();
    for (const s of socialPagesQuery.data?.selections ?? []) m.set(s.platformSlug, s);
    return m;
  }, [socialPagesQuery.data]);

  const queueStatsBySlug = useMemo(
    () => platformStatsBySlug(queueQuery.data?.byPlatform),
    [queueQuery.data],
  );

  // Backend already scopes platforms to the dealer's businessCategory (fail-closed in
  // resolvePublishTargets). Do not re-filter by categorySchema.id here — while
  // fetchDealers is loading, categorySchema is the WATCHES loading sentinel and
  // would hide every platform even though the API returned the correct set.
  const platforms = useMemo(() => data?.platforms ?? [], [data]);

  const featuredMarketplace = useMemo(
    () => platforms.find(p => p.platformSlug === AUTO_MARKETPLACE_SLUG) ?? null,
    [platforms]
  );

  const marketplaceCategorySlug = useMemo(() => {
    if (categorySchema.status !== 'placeholder') return categorySchema.id.toLowerCase();
    const fromPlatform = featuredMarketplace?.supportedCategories[0];
    return (fromPlatform ?? 'automotive').toLowerCase();
  }, [categorySchema, featuredMarketplace]);

  const visible = useMemo(() => {
    const list = platforms
      .filter(p => !hideFromPlatformsChannelList(p.platformSlug))
      .filter(p => platformMatchesFilter(p, filter));
    return sortPlatformsForDisplay(list, sort);
  }, [platforms, filter, sort]);

  const handleRefresh = () => {
    reload();
    accountsQuery.reload();
    perfQuery.reload();
    socialPagesQuery.reload();
    queueQuery.reload();
  };

  if (error && !data) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={handleRefresh}>
        <ErrorState message={error} onRetry={handleRefresh} />
      </OperatorPage>
    );
  }

  const situation = data ? platformSituationSummary(platforms) : operatorCopy.platforms.loading;

  // Distinguish "category has no platforms" from "user filter excluded results".
  const noUserFilter = filter === 'ALL';
  const noCategoryPlatforms = !!data && platforms.length === 0;
  const channelEmptyMessage =
    noCategoryPlatforms && noUserFilter
      ? `No platforms are configured for ${categorySchema.label} yet.`
      : operatorCopy.platforms.emptyFilter;

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={data?.dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={handleRefresh}
      refreshing={loading}
      lastRefresh={lastRefresh ?? undefined}
      hideDealerId
    >
      <PageSituation title={operatorCopy.platforms.title} line={situation} />

      <div className="mb-5 -mt-1 max-w-3xl">
        <InlineCallout title={operatorCopy.platforms.educationTitle}>
          <p className="text-xs leading-relaxed">{operatorCopy.platforms.educationIntro}</p>
          <ul className="mt-2 list-disc pl-4 space-y-1 text-xs">
            {operatorCopy.platforms.educationPoints.map(point => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </InlineCallout>
      </div>

      {connectedSlug && (
        <PlatformConnectBanner
          platformName={platformDisplayName(
            connectedSlug,
            platforms.find(p => p.platformSlug === connectedSlug)?.platformName ?? connectedSlug,
          )}
          platformSlug={connectedSlug}
          stats={queueStatsBySlug.get(connectedSlug) ?? null}
          readyVehicleCount={data?.vehicles?.ready}
          nav={nav}
          onDismiss={() => setConnectedSlug(null)}
        />
      )}

      {featuredMarketplace && (
        <FeaturedMarketplaceSection
          platform={featuredMarketplace}
          account={accountBySlug.get(featuredMarketplace.platformSlug) ?? null}
          dealerId={dealerId}
          categorySlug={marketplaceCategorySlug}
          nav={nav}
        />
      )}

      <div className="mb-4">
        <FilterChips
          chips={PLATFORM_CONNECTION_FILTERS.map(f => ({ key: f.key, label: f.label }))}
          activeKey={filter}
          onSelect={key => setFilter(key as PlatformConnectionFilter)}
        />
      </div>

      <OAuthConnectBanner
        platforms={platforms}
        accountBySlug={accountBySlug}
        dealerId={dealerId}
        onDone={() => {
          accountsQuery.reload();
          reload();
          queueQuery.reload();
        }}
      />

      <PlatformChannelList
        platforms={visible}
        perfBySlug={perfBySlug}
        accountBySlug={accountBySlug}
        socialPageBySlug={socialPageBySlug}
        queueStatsBySlug={queueStatsBySlug}
        dealerId={dealerId}
        nav={nav}
        selectedSlug={selectedSlug}
        onSelectSlug={setSelectedSlug}
        onAccountSaved={() => {
          accountsQuery.reload();
          socialPagesQuery.reload();
          reload();
          queueQuery.reload();
        }}
        onPlatformConnected={slug => {
          setConnectedSlug(slug);
          queueQuery.reload();
        }}
        loading={loading && !data}
        emptyMessage={channelEmptyMessage}
      />
    </OperatorPage>
  );
}
