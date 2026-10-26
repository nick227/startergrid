import { useState } from 'react';
import { OwnershipLine } from '@/components/guidance/OwnershipLine.tsx';
import { PlatformLogo } from './PlatformLogo.tsx';
import { platformDisplayName, AUTO_MARKETPLACE_SLUG } from '@/lib/marketplaceBrand.ts';
import type { PlatformPublishResult, PlatformAccountDetail } from '@/lib/types.ts';
import { getSetupReadiness } from '@/lib/setupReadiness.ts';

type Props = {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
  dealerId: string;
  storefrontHref?: string;
  onOpen: () => void;
};

export function ChannelDestinationCard({ platform, account, dealerId, storefrontHref, onOpen }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const readiness = getSetupReadiness(platform, account);
  const hasErrors = readiness.severity === 'critical' || platform.accountState === 'ERROR';
  const isConnected =
    platform.accountState === 'ACTIVE' ||
    platform.state === 'Active' ||
    platform.state === 'Ready' ||
    platform.state === 'Scheduled';
  const isFirstParty = platform.platformSlug === AUTO_MARKETPLACE_SLUG;
  const name = platformDisplayName(platform.platformSlug, platform.platformName);

  const actionLabel = hasErrors
    ? `Fix ${name}`
    : !isConnected
      ? platform.connectionType === 'OAUTH'
        ? `Connect ${name}`
        : `Set up ${name}`
      : `Open ${name}`;

  const statusLabel = hasErrors ? 'Needs a fix' : isConnected ? 'Connected' : 'Not connected';
  const description = isFirstParty
    ? 'Your StarterGrid storefront. A listing here is not verified live until a send succeeds.'
    : isConnected
      ? 'Connected. That does not mean listings are live yet.'
      : 'Connect this destination so ready vehicles can be sent here.';

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
            <p className="text-xs text-ink-muted mt-0.5">{description}</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
            hasErrors
              ? 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
              : isConnected
                ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                : 'bg-silver-100 text-ink-muted border-silver-300'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {hasErrors && (
        <div className="mt-3">
          <OwnershipLine action={`Fix ${name}`} ownerKind="YOU" due="today" />
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-silver-200/70 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setAdvancedOpen(open => !open)}
          className="text-[11px] font-semibold text-ink-muted hover:text-ink-heading"
        >
          {advancedOpen ? 'Hide technical details' : 'Technical details'}
        </button>
        <div className="flex items-center gap-2">
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

      {advancedOpen && (
        <div className="mt-3 pt-3 border-t border-silver-200 bg-silver-50 -mx-5 -mb-5 p-4 rounded-b-xl space-y-2 text-xs">
          <p className="text-[11px] text-ink-muted">Technical identifiers for support. These do not change how vehicles are listed.</p>
          <div className="flex items-center justify-between font-mono text-[11px] text-ink-faint">
            <span>{platform.platformSlug}</span>
            <span>{platform.state || '—'}</span>
          </div>
          <div className="p-2 bg-white rounded border border-silver-200 font-mono text-[11px] text-ink-body break-all">
            /api/dealers/{dealerId}/platforms/{platform.platformSlug}/feed
          </div>
        </div>
      )}
    </div>
  );
}
