import { useMemo, useState, useEffect } from 'react';
import { fetchPublishStatus, fetchAccounts, fetchPlatformPerformance, fetchSelectedSocialPages } from '@/lib/api/sdk.ts';
import type { PlatformAccountDetail, PlatformPerformanceItem, PlatformPublishResult, SelectedSocialPage } from '@/lib/types.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { OperatorPage, ErrorState } from '@/components/operator';
import { PageSituation, ControlBlock } from '@/components/layout';
import { FilterChips } from '@/components/generic';
import { PlatformChannelList } from '@/components/platforms/PlatformChannelList.tsx';
import { OAuthConnectBanner } from '@/components/platforms/OAuthConnectBanner.tsx';
import { NextBestActionPanel } from '@/components/platforms/NextBestActionPanel.tsx';
import {
  PLATFORM_CONNECTION_FILTERS,
  platformConnectionWithAccount,
  platformMatchesFilter,
  platformSituationSummary,
  sortPlatformsForDisplay,
  type PlatformConnectionFilter,
} from '@/lib/platformPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';

type Props = OperatorPageBaseProps & {
  initialPlatformSlug?: string | null;
};

function DealerStorefrontFeature({
  platform,
  account,
}: {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
}) {
  const conn = platformConnectionWithAccount(platform, account);
  const connected = conn.connection === 'connected' || conn.connection === 'updating';
  const statusTone = connected
    ? 'bg-green-100 text-green-800 border-green-200'
    : conn.connection === 'blocked'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <section className="pb-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-navy-700">Featured platform</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusTone}`}>
              {conn.label}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-ink-heading">Dealer Storefront</h2>
          <p className="mt-1 text-sm text-ink-muted max-w-2xl">
            Use the in-house marketplace storefront to get started publishing.
          </p>
        </div>
      </div>
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

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PlatformConnectionFilter>('ALL');
  const [sort] = useState<'urgency' | 'name'>('urgency');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialPlatformSlug ?? null);

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

  const platforms = useMemo(
    () => (data?.platforms ?? []).filter(p => p.supportedCategories.includes(categorySchema.id)),
    [data, categorySchema.id]
  );

  const featuredStorefront = useMemo(
    () => platforms.find(p => p.platformSlug === 'dealer-storefront') ?? null,
    [platforms]
  );

  const visible = useMemo(() => {
    let list = platforms
      .filter(p => p.platformSlug !== featuredStorefront?.platformSlug)
      .filter(p => platformMatchesFilter(p, filter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.platformName.toLowerCase().includes(q) ||
          p.platformSlug.toLowerCase().includes(q)
      );
    }
    return sortPlatformsForDisplay(list, sort);
  }, [platforms, filter, search, sort]);

  const handleRefresh = () => {
    reload();
    accountsQuery.reload();
    perfQuery.reload();
    socialPagesQuery.reload();
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
  const noUserFilter = filter === 'ALL' && !search.trim();
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

      {featuredStorefront && (
        <DealerStorefrontFeature
          platform={featuredStorefront}
          account={accountBySlug.get(featuredStorefront.platformSlug) ?? null}
        />
      )}

      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.platforms.searchPlaceholder}
        filters={
          <FilterChips
            chips={PLATFORM_CONNECTION_FILTERS.map(f => ({ key: f.key, label: f.label }))}
            activeKey={filter}
            onSelect={key => setFilter(key as PlatformConnectionFilter)}
          />
        }
      />

      <NextBestActionPanel
        platforms={platforms}
        accountBySlug={accountBySlug}
        dealerId={dealerId}
        onDone={() => {
          accountsQuery.reload();
          reload();
        }}
        onSelectSlug={setSelectedSlug}
      />

      <OAuthConnectBanner
        platforms={platforms}
        accountBySlug={accountBySlug}
        dealerId={dealerId}
        onDone={() => {
          accountsQuery.reload();
          reload();
        }}
      />

      <PlatformChannelList
        platforms={visible}
        perfBySlug={perfBySlug}
        accountBySlug={accountBySlug}
        socialPageBySlug={socialPageBySlug}
        dealerId={dealerId}
        nav={nav}
        selectedSlug={selectedSlug}
        onSelectSlug={setSelectedSlug}
        onAccountSaved={() => {
          accountsQuery.reload();
          socialPagesQuery.reload();
          reload();
        }}
        loading={loading && !data}
        emptyMessage={channelEmptyMessage}
      />
    </OperatorPage>
  );
}
