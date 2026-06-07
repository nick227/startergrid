import type { PlatformPublishResult, PlatformAccountDetail, PlatformPerformanceItem } from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { PanelSkeleton } from '@/components/operator';
import { PlatformDetailDrawer } from './PlatformDetailDrawer.tsx';
import { platformConnection } from '@/lib/platformPresentation.ts';
import {
  channelSecondaryMeta,
  channelDesktopFields,
  channelRowSurface,
} from '@/lib/channelRowPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = {
  platforms: PlatformPublishResult[];
  perfBySlug: Map<string, PlatformPerformanceItem>;
  accountBySlug: Map<string, PlatformAccountDetail>;
  dealerId: string;
  nav: OperatorNavHandlers;
  selectedSlug: string | null;
  onSelectSlug: (slug: string | null) => void;
  onAccountSaved: () => void;
  loading?: boolean;
  emptyMessage: string;
};

export function PlatformChannelList({
  platforms,
  perfBySlug,
  accountBySlug,
  dealerId,
  nav,
  selectedSlug,
  onSelectSlug,
  onAccountSaved,
  loading,
  emptyMessage,
}: Props) {
  if (loading) return <PanelSkeleton rows={6} />;
  if (!platforms.length) {
    return <p className="text-sm text-ink-muted py-8 text-center">{emptyMessage}</p>;
  }

  const selected = selectedSlug
    ? platforms.find(p => p.platformSlug === selectedSlug) ?? null
    : null;

  return (
    <div className={`${selected ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
      <div className="space-y-3">
        {platforms.map(platform => {
          const conn = platformConnection(platform);
          const perf = perfBySlug.get(platform.platformSlug);

          return (
            <OpsRowCard
              key={platform.platformSlug}
              title={platform.platformName}
              statusLabel={conn.label}
              statusClassName={conn.pill}
              secondaryMeta={channelSecondaryMeta(platform)}
              desktopFields={channelDesktopFields(platform, perf)}
              detailOpen={selectedSlug === platform.platformSlug}
              surfaceClassName={channelRowSurface(conn.connection)}
              actions={[
                {
                  label: operatorCopy.channels.rowActions.details,
                  onClick: () => onSelectSlug(platform.platformSlug),
                },
                {
                  label: operatorCopy.channels.rowActions.queue,
                  onClick: () => nav.goToPlatformQueue(platform.platformSlug),
                },
                {
                  label: operatorCopy.channels.rowActions.history,
                  onClick: () => nav.goToPlatformHistory(platform.platformSlug),
                },
              ]}
            />
          );
        })}
      </div>

      {selected && (
        <PlatformDetailDrawer
          platform={selected}
          account={accountBySlug.get(selected.platformSlug) ?? null}
          dealerId={dealerId}
          nav={nav}
          open
          onClose={() => onSelectSlug(null)}
          onSaved={onAccountSaved}
        />
      )}
    </div>
  );
}
