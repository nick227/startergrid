import type { PlatformAccountDetail, PlatformPerformanceItem, PlatformPublishResult } from '@/lib/types.ts';
import { ChannelDestinationCard } from './ChannelDestinationCard.tsx';

export type ChannelRow = {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
};

export function ChannelDestinationGrid({
  rows,
  perfBySlug,
  dealerId,
  storefrontHref,
  onOpen,
}: {
  rows: ChannelRow[];
  perfBySlug: Map<string, PlatformPerformanceItem>;
  dealerId: string;
  storefrontHref?: string;
  onOpen: (slug: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rows.map(({ platform, account }) => (
        <ChannelDestinationCard
          key={platform.platformSlug}
          platform={platform}
          account={account}
          perf={perfBySlug.get(platform.platformSlug) ?? null}
          dealerId={dealerId}
          storefrontHref={storefrontHref}
          onOpen={() => onOpen(platform.platformSlug)}
        />
      ))}
    </div>
  );
}
