import { useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import {
  fetchCategoryItemMarketplaceListing,
  publishCategoryItemToMarketplace,
  unpublishCategoryItemFromMarketplace,
  type CategoryItemListingRecord,
} from '@/lib/api/sdk.ts';

type Props = {
  dealerId: string;
  categoryItemId: string;
  listingStatus: string;
};

const MARKETPLACE_URL = import.meta.env['VITE_MARKETPLACE_URL'] as string | undefined ?? 'http://localhost:5174';

function statusBadge(status: CategoryItemListingRecord['status']) {
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

export function CategoryItemPublishPanel({ dealerId, categoryItemId, listingStatus }: Props) {
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: listing, loading, reload } = useAsyncQuery(
    () => fetchCategoryItemMarketplaceListing(dealerId, categoryItemId),
    [dealerId, categoryItemId],
  );

  const isActive = listing?.status === 'ACTIVE';
  const isReady = listingStatus === 'READY';

  const handlePublish = async () => {
    setWorking(true);
    setActionError(null);
    try {
      await publishCategoryItemToMarketplace(dealerId, categoryItemId);
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
      await unpublishCategoryItemFromMarketplace(dealerId, categoryItemId);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to unpublish');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div className="h-6 w-32 bg-silver-100 animate-pulse rounded" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-ink-muted font-medium">Consumer Marketplace</span>
        {listing ? statusBadge(listing.status) : (
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-silver-100 text-ink-muted">
            Not listed
          </span>
        )}
        {isActive && (
          <a
            href={`${MARKETPLACE_URL}/marketplace/category-items/${categoryItemId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-navy-600 hover:underline"
          >
            View live ↗
          </a>
        )}
      </div>

      {!isReady && !isActive && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
          Mark as Ready before publishing — complete all required fields first.
        </p>
      )}

      {actionError && (
        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
          {actionError}
        </p>
      )}

      <div className="flex items-center gap-2">
        {!isActive ? (
          <button
            type="button"
            onClick={handlePublish}
            disabled={working || (!isReady && !isActive)}
            className="px-4 py-1.5 bg-navy-900 text-white text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-navy-800 transition-colors"
          >
            {working ? 'Publishing…' : 'Publish to Marketplace'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={working}
            className="px-4 py-1.5 bg-white border border-silver-300 text-ink-body text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-silver-50 transition-colors"
          >
            {working ? 'Unpublishing…' : 'Unpublish'}
          </button>
        )}
      </div>

      {listing?.listedAt && (
        <p className="text-[10px] text-ink-faint">
          Listed {new Date(listing.listedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
