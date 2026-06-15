import type { OwnedChannelView } from '@/lib/types.ts';
import { PlatformLogo } from '@/components/platforms/PlatformLogo.tsx';
import { platformDisplayName } from '@/lib/marketplaceBrand.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = {
  channels: OwnedChannelView[];
};

export function QueueOwnedChannelsStrip({ channels }: Props) {
  if (channels.length === 0) return null;

  return (
    <section className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/70 mb-2">
        {operatorCopy.queue.ownedChannelsTitle}
      </p>
      <ul className="space-y-2">
        {channels.map(channel => (
          <li key={channel.platformSlug} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <PlatformLogo slug={channel.platformSlug} name={channel.platformName} size="sm" />
              <span className="text-sm font-semibold text-ink-heading truncate">
                {platformDisplayName(channel.platformSlug, channel.platformName)}
              </span>
            </div>
            <span className="shrink-0 text-xs font-medium text-emerald-800">{channel.statusLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
