import { useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { OperatorPage, PageHeader } from '@/components/operator';
import { ChannelsOverview } from '@/components/platforms/ChannelsOverview.tsx';
import { DealershipAutopilot } from '@/components/guidance/DealershipAutopilot.tsx';
import { SyndicationSentryCard } from '@/components/platforms/SyndicationSentryCard.tsx';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPublishStatus } from '@/lib/api/sdk.ts';
import { channelHash } from '@/lib/routes.ts';

type Props = OperatorPageBaseProps;

/** Channels: what each kind of channel is doing, then each channel opens its own page. */
export default function PlatformsPage({ dealerId, nav, activeTab }: Props) {
  const { data: status, reload, loading, lastRefresh } = useAsyncQuery(() => fetchPublishStatus(dealerId), [dealerId]);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={status?.dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={() => { reload(); setRefreshKey(k => k + 1); }}
      refreshing={loading}
      lastRefresh={lastRefresh ?? undefined}
      hideDealerId
    >
      <PageHeader title="Channels" />
      <div className="space-y-6">
        <DealershipAutopilot dealerId={dealerId} hideWhenUnavailable />
        <SyndicationSentryCard dealerId={dealerId} hideWhenClean />
        <ChannelsOverview dealerId={dealerId} hrefFor={(channel, view) => channelHash(dealerId, channel, view)} refreshKey={refreshKey} />
      </div>
    </OperatorPage>
  );
}
