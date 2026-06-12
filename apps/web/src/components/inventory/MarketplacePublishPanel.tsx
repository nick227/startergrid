import { useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import {
  fetchMarketplaceListing,
  publishToMarketplace,
  unpublishFromMarketplace,
  type MarketplaceListingRecord,
} from '@/lib/api/sdk.ts';

type Props = {
  dealerId: string;
  vehicleId: string;
};

const MARKETPLACE_URL = import.meta.env['VITE_MARKETPLACE_URL'] as string | undefined ?? 'http://localhost:5174';

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

export function MarketplacePublishPanel({ dealerId, vehicleId }: Props) {
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: listing, loading, reload } = useAsyncQuery(
    () => fetchMarketplaceListing(dealerId, vehicleId),
    [dealerId, vehicleId],
  );

  const isActive = listing?.status === 'ACTIVE';

  const handlePublish = async () => {
    setWorking(true);
    setActionError(null);
    try {
      await publishToMarketplace(dealerId, vehicleId);
      reload();
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
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to unpublish');
    } finally {
      setWorking(false);
    }
  };

  if (loading && !listing) {
    return <div className="text-xs text-ink-muted animate-pulse">Loading…</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-body font-medium">Dealer Storefront</span>
          {listing ? statusBadge(listing.status) : (
            <span className="text-[10px] text-ink-faint">Not published</span>
          )}
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
            disabled={working}
            className="text-xs px-2.5 py-1 rounded bg-navy-700 text-white hover:bg-navy-600 disabled:opacity-50 transition-colors font-semibold"
          >
            {working ? 'Publishing…' : 'Publish online'}
          </button>
        )}
      </div>

      {isActive && listing?.listedAt && (
        <p className="text-[10px] text-ink-muted">
          Live since {new Date(listing.listedAt).toLocaleDateString()}.{' '}
          <a
            href={`${MARKETPLACE_URL}/automotive/listings/${vehicleId}?demo=1`}
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
