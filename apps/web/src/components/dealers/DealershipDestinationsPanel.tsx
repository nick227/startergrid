import { ChannelsOverview } from '@/components/platforms/ChannelsOverview.tsx';
import { channelHash } from '@/lib/routes.ts';

/**
 * Channels on the dealership record. Staff open a channel the way the dealer sees it, in
 * support mode, so there is one channel page for everyone.
 */
export function DealershipDestinationsPanel({ dealerId }: { dealerId: string }) {
  return (
    <ChannelsOverview
      dealerId={dealerId}
      hrefFor={(channel, view) => `${channelHash(dealerId, channel, view)}?support=true`}
    />
  );
}
