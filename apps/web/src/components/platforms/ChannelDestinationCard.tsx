import { OwnershipLine } from '@/components/guidance/OwnershipLine.tsx';
import { PlatformLogo } from './PlatformLogo.tsx';
import { platformDisplayName, AUTO_MARKETPLACE_SLUG } from '@/lib/marketplaceBrand.ts';
import type { PlatformPublishResult, PlatformAccountDetail, PlatformPerformanceItem } from '@/lib/types.ts';
import { getSetupReadiness } from '@/lib/setupReadiness.ts';
import { channelCardCopy } from '@/lib/destinationPrimary.ts';
import { platformLooksConnected } from '@/lib/pagePrimaryState.ts';

type Props = {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
  perf?: PlatformPerformanceItem | null;
  dealerId?: string;
  storefrontHref?: string;
  onOpen: () => void;
};

export function ChannelDestinationCard({ platform, account, perf, storefrontHref, onOpen }: Props) {
  const readiness = getSetupReadiness(platform, account);
  const hasErrors = readiness.severity === 'critical' || platform.accountState === 'ERROR';
  const isFirstParty = platform.platformSlug === AUTO_MARKETPLACE_SLUG;
  const isConnected = platformLooksConnected(platform);
  const name = platformDisplayName(platform.platformSlug, platform.platformName);
  const sentCount = perf?.vehiclesListed ?? 0;
  const copy = channelCardCopy({
    connected: isConnected,
    hasErrors,
    sentCount,
    firstParty: isFirstParty,
  });

  const actionLabel = hasErrors
    ? `Fix ${name}`
    : !isConnected
      ? `Set up ${name}`
      : `Open ${name}`;

  const badgeClass = hasErrors
    ? 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
    : sentCount > 0
      ? 'bg-navy-50 text-navy-700 border-navy-200'
      : isConnected
        ? 'bg-navy-50 text-navy-700 border-navy-200'
        : 'bg-silver-100 text-ink-muted border-silver-300';

  return (
    <div
      className={`p-5 rounded-xl border transition-all ${
        hasErrors
          ? 'border-amber-300 bg-amber-50/20'
          : isConnected
            ? 'border-silver-200 bg-white hover:border-silver-300 shadow-elevation-1'
            : 'border-silver-200 bg-silver-50/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="pt-0.5 shrink-0">
            <PlatformLogo slug={platform.platformSlug} name={platform.platformName} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink-heading">{name}</h3>
            <p className="text-xs text-ink-muted mt-0.5">{copy.description}</p>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badgeClass}`}>
          {copy.status}
        </span>
      </div>

      {hasErrors && (
        <div className="mt-3">
          <OwnershipLine action={`Fix ${name}`} ownerKind="YOU" due="today" />
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-silver-200/70 flex flex-wrap items-center justify-end gap-2">
        {isFirstParty && storefrontHref && (
          <a
            href={storefrontHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-xs font-semibold rounded-md border border-silver-300 bg-white text-ink-heading hover:bg-silver-100"
          >
            View storefront
          </a>
        )}
        <button
          type="button"
          onClick={onOpen}
          className="px-3 py-1 text-xs font-bold rounded-md bg-navy-900 hover:bg-navy-800 text-white shadow-sm"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
