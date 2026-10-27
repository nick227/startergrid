import { useMemo } from 'react';
import { fetchPublishStatus, fetchAccounts, fetchPlatformPerformance, fetchSelectedSocialPages, fetchPublishQueue } from '@/lib/api/sdk.ts';
import type { PlatformAccountDetail, PlatformPerformanceItem } from '@/lib/types.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { AUTO_MARKETPLACE_SLUG, DEALER_STOREFRONT_FEED_SLUG } from '@/lib/marketplaceBrand.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { platformStatsBySlug } from '@/lib/platformQueueStats.ts';

const MARKETPLACE_URL = (import.meta.env['VITE_MARKETPLACE_URL'] as string | undefined) ?? 'http://localhost:5174';

export function useChannelWorkspace(dealerId: string) {
  const categorySchema = useCategorySchema();
  const status = useAsyncQuery(() => fetchPublishStatus(dealerId), [dealerId]);
  const accounts = useAsyncQuery(() => fetchAccounts(dealerId), [dealerId]);
  const perf = useAsyncQuery(() => fetchPlatformPerformance(dealerId), [dealerId]);
  const social = useAsyncQuery(() => fetchSelectedSocialPages(dealerId), [dealerId]);
  const queue = useAsyncQuery(() => fetchPublishQueue(dealerId), [dealerId]);

  const accountBySlug = useMemo(() => {
    const m = new Map<string, PlatformAccountDetail>();
    for (const a of accounts.data?.accounts ?? []) m.set(a.platformSlug, a);
    return m;
  }, [accounts.data]);

  const perfBySlug = useMemo(() => {
    const m = new Map<string, PlatformPerformanceItem>();
    for (const p of perf.data?.platforms ?? []) m.set(p.platformSlug, p);
    return m;
  }, [perf.data]);

  const platforms = useMemo(
    () => (status.data?.platforms ?? []).filter(p => p.platformSlug !== DEALER_STOREFRONT_FEED_SLUG),
    [status.data],
  );
  const featured = platforms.find(p => p.platformSlug === AUTO_MARKETPLACE_SLUG) ?? null;
  const categorySlug = categorySchema.status !== 'placeholder'
    ? categorySchema.id.toLowerCase()
    : (featured?.supportedCategories[0] ?? 'automotive').toLowerCase();

  const reload = () => {
    status.reload();
    accounts.reload();
    perf.reload();
    social.reload();
    queue.reload();
  };

  return {
    platforms,
    accountBySlug,
    perfBySlug,
    storefrontHref: featured
      ? `${MARKETPLACE_URL}#/${categorySlug}/seller/${encodeURIComponent(dealerId)}`
      : undefined,
    loading: status.loading && !status.data,
    error: status.error,
    reload,
    lastRefresh: status.lastRefresh,
    dealerName: status.data?.dealerName,
    readyVehicleCount: status.data?.vehicles?.ready,
    emptyMessage: status.data && platforms.length === 0
      ? `No destinations are available for ${categorySchema.label} yet.`
      : operatorCopy.platforms.emptyFilter,
    queueStatsBySlug: platformStatsBySlug(queue.data?.byPlatform),
    reloadAccounts: accounts.reload,
    reloadStatus: status.reload,
    reloadSocial: social.reload,
    reloadQueue: queue.reload,
  };
}
