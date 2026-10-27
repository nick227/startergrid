import { useMemo, useState, useEffect } from 'react';
import { fetchPublishStatus, fetchAccounts, fetchPlatformPerformance, fetchSelectedSocialPages, fetchPublishQueue } from '@/lib/api/sdk.ts';
import type { PlatformAccountDetail, PlatformPerformanceItem } from '@/lib/types.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { OperatorPage, ErrorState, PageHeader } from '@/components/operator';
import { SimplifiedChannelsView } from '@/components/platforms/SimplifiedChannelsView.tsx';
import { OAuthConnectBanner } from '@/components/platforms/OAuthConnectBanner.tsx';
import { platformDisplayName, AUTO_MARKETPLACE_SLUG, DEALER_STOREFRONT_FEED_SLUG } from '@/lib/marketplaceBrand.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { PlatformConnectBanner } from '@/components/platforms/PlatformConnectBanner.tsx';
import { platformStatsBySlug } from '@/lib/platformQueueStats.ts';

const MARKETPLACE_URL = (import.meta.env['VITE_MARKETPLACE_URL'] as string | undefined) ?? 'http://localhost:5174';

type Props = OperatorPageBaseProps & {
  initialPlatformSlug?: string | null;
};

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

  const queueStatsBySlug = useMemo(
    () => platformStatsBySlug(queueQuery.data?.byPlatform),
    [queueQuery.data],
  );

  const platforms = useMemo(
    () => (data?.platforms ?? []).filter(p => p.platformSlug !== DEALER_STOREFRONT_FEED_SLUG),
    [data],
  );
  const featuredMarketplace = platforms.find(p => p.platformSlug === AUTO_MARKETPLACE_SLUG) ?? null;

  const marketplaceCategorySlug = useMemo(() => {
    if (categorySchema.status !== 'placeholder') return categorySchema.id.toLowerCase();
    const fromPlatform = featuredMarketplace?.supportedCategories[0];
    return (fromPlatform ?? 'automotive').toLowerCase();
  }, [categorySchema, featuredMarketplace]);

  const storefrontHref = featuredMarketplace
    ? `${MARKETPLACE_URL}#/${marketplaceCategorySlug}/seller/${encodeURIComponent(dealerId)}`
    : undefined;

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

  const noCategoryPlatforms = !!data && platforms.length === 0;
  const channelEmptyMessage = noCategoryPlatforms
    ? `No destinations are available for ${categorySchema.label} yet.`
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
      <PageHeader title="Channels" />

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

      <SimplifiedChannelsView
        platforms={platforms}
        perfBySlug={perfBySlug}
        accountBySlug={accountBySlug}
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
        loading={loading && !data}
        emptyMessage={channelEmptyMessage}
        storefrontHref={storefrontHref}
      />
    </OperatorPage>
  );
}
