import { useEffect, useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import {
  fetchMarketplaceListing,
  fetchVehicleChannels,
  publishToMarketplace,
  setVehicleChannelSelection,
  unpublishFromMarketplace,
  type MarketplaceListingRecord,
} from '@/lib/api/sdk.ts';
import { buildConsumerMarketplaceListingUrl } from '@/lib/marketplaceListingUrl.ts';

const CONSUMER_MARKETPLACE_SLUG = 'consumer-marketplace';

type SectionStatus = 'complete' | 'needs_attention' | 'incomplete';

type Props = {
  dealerId: string;
  vehicleId: string;
  listingTitle?: string;
  refreshKey?: number;
  onStatusChange?: (status: SectionStatus) => void;
  onSelectionChange?: () => void;
};

function statusBadge(status: MarketplaceListingRecord['status']) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Live
      </span>
    );
  }
  if (status === 'ENDED') {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-silver-100 text-ink-muted">
        Ended
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700">
        Failed
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
      Draft
    </span>
  );
}

export function MarketplacePublishPanel({
  dealerId,
  vehicleId,
  listingTitle,
  refreshKey = 0,
  onStatusChange,
  onSelectionChange,
}: Props) {
  const [working, setWorking] = useState(false);
  const [togglingSelection, setTogglingSelection] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: listing, loading, reload } = useAsyncQuery(
    () => fetchMarketplaceListing(dealerId, vehicleId),
    [dealerId, vehicleId, refreshKey],
  );

  const { data: channelMatrix, loading: channelsLoading, reload: reloadChannels } = useAsyncQuery(
    () => fetchVehicleChannels(dealerId, vehicleId),
    [dealerId, vehicleId, refreshKey],
  );

  const channel = channelMatrix?.channels.find(c => c.channelKey === CONSUMER_MARKETPLACE_SLUG);
  const isActive = listing?.status === 'ACTIVE';
  const selectionDisabled = togglingSelection || working || !channel?.connected;

  useEffect(() => {
    if (!onStatusChange || !channel) return;
    if (
      listing?.status === 'FAILED' ||
      (channel.selected && channel.connected && !channel.eligible)
    ) {
      onStatusChange('needs_attention');
      return;
    }
    if (channel.selected && !isActive) {
      onStatusChange('incomplete');
      return;
    }
    onStatusChange('complete');
  }, [channel, isActive, listing?.status, onStatusChange]);

  const handlePublish = async () => {
    setWorking(true);
    setActionError(null);
    try {
      await publishToMarketplace(dealerId, vehicleId);
      reload();
      onSelectionChange?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setWorking(false);
    }
  };

  const handleUnpublish = async () => {
    setWorking(true);
    setActionError(null);
    try {
      await unpublishFromMarketplace(dealerId, vehicleId);
      reload();
      onSelectionChange?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to unpublish');
    } finally {
      setWorking(false);
    }
  };

  const handleSelectionToggle = async () => {
    if (!channel) return;
    setTogglingSelection(true);
    setActionError(null);
    try {
      await setVehicleChannelSelection(dealerId, vehicleId, CONSUMER_MARKETPLACE_SLUG, !channel.selected);
      reloadChannels();
      onSelectionChange?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update selection');
    } finally {
      setTogglingSelection(false);
    }
  };

  if ((loading && !listing) || (channelsLoading && !channelMatrix)) {
    return <div className="text-xs text-ink-muted animate-pulse">Loading…</div>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-5 text-ink-muted">
        Ready makes this vehicle eligible. Selected includes it on this channel. Publish creates the live listing.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-body font-semibold">Auto Marketplace</span>
          {listing ? statusBadge(listing.status) : (
            <span className="text-[10px] text-ink-faint">Not published</span>
          )}
          {!channel?.connected && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-silver-100 text-ink-muted border-silver-200 uppercase">
              Connect first
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Selected</span>
            <button
              type="button"
              role="switch"
              aria-checked={channel?.selected ?? false}
              disabled={selectionDisabled}
              onClick={() => void handleSelectionToggle()}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors disabled:opacity-50 ${
                channel?.selected ? 'bg-green-600' : 'bg-silver-300'
              }`}
              title={
                !channel?.connected
                  ? 'Connect Auto Marketplace on Platforms before managing vehicle selection'
                  : channel.selected
                    ? 'Exclude this vehicle from Auto Marketplace'
                    : 'Include this vehicle on Auto Marketplace'
              }
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                channel?.selected ? 'translate-x-3.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {isActive ? (
            <button
              type="button"
              onClick={() => void handleUnpublish()}
              disabled={working}
              className="text-xs px-2.5 py-1 rounded border border-silver-300 text-ink-muted hover:bg-silver-100 disabled:opacity-50 transition-colors"
            >
              {working ? 'Removing…' : 'Remove'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={working || !channel?.selected}
              className="text-xs px-2.5 py-1 rounded bg-navy-700 text-white hover:bg-navy-600 disabled:opacity-50 transition-colors font-semibold"
            >
              {working ? 'Publishing…' : 'Publish online'}
            </button>
          )}
        </div>
      </div>

      {isActive && listing?.listedAt && (
        <p className="text-[10px] text-ink-muted">
          Live since {new Date(listing.listedAt).toLocaleDateString()}.{' '}
          <a
            href={buildConsumerMarketplaceListingUrl(vehicleId, { title: listingTitle })}
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy-600 underline"
          >
            View on marketplace
          </a>
        </p>
      )}

      {actionError && (
        <p className="text-xs text-red-600">{actionError}</p>
      )}
    </div>
  );
}
