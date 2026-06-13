import { useEffect, useState } from 'react';
import {
  fetchCategoryItemDetail,
  type CategoryInventoryItemDetail,
} from '@/lib/api/sdk.ts';
import { VehicleReadinessChecklist } from './VehicleReadinessChecklist.tsx';
import { EbookItemFields, ebookFieldsFromData, type EbookFields } from './EbookItemFields.tsx';
import { SongItemFields, songFieldsFromData, type SongFields } from './SongItemFields.tsx';
import { DigitalArtItemFields, digitalArtFieldsFromData, type DigitalArtFields } from './DigitalArtItemFields.tsx';
import { VideoItemFields, videoFieldsFromData, type VideoFields } from './VideoItemFields.tsx';
import { CategoryItemPublishPanel } from './CategoryItemPublishPanel.tsx';

type Props = {
  dealerId: string;
  itemId: string;
  onClose?: () => void;
};

function formatPrice(cents: number | null): string {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function lifecycleBadge(status: string) {
  if (status === 'SOLD')    return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-700">SOLD</span>;
  if (status === 'REMOVED') return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-silver-100 text-ink-muted">REMOVED</span>;
  return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-100 text-green-700">AVAILABLE</span>;
}

function listingBadge(status: string) {
  if (status === 'READY') return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-navy-100 text-navy-700">READY</span>;
  return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-700">DRAFT</span>;
}

export function CategoryItemDetailPanel({ dealerId, itemId, onClose }: Props) {
  const [item, setItem] = useState<CategoryInventoryItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ebookFields, setEbookFields] = useState<EbookFields | null>(null);
  const [songFields, setSongFields] = useState<SongFields | null>(null);
  const [artFields, setArtFields] = useState<DigitalArtFields | null>(null);
  const [videoFields, setVideoFields] = useState<VideoFields | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItem(null);
    setEbookFields(null);
    setSongFields(null);
    setArtFields(null);
    setVideoFields(null);
    fetchCategoryItemDetail(dealerId, itemId)
      .then(data => {
        if (cancelled) return;
        setItem(data);
        if (data.categoryId === 'EBOOKS') {
          setEbookFields(ebookFieldsFromData(data.data));
        } else if (data.categoryId === 'SONGS') {
          setSongFields(songFieldsFromData(data.data));
        } else if (data.categoryId === 'DIGITAL_ART') {
          setArtFields(digitalArtFieldsFromData(data.data));
        } else if (data.categoryId === 'VIDEO_DISTRIBUTION') {
          setVideoFields(videoFieldsFromData(data.data));
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dealerId, itemId]);

  if (loading) {
    return (
      <div className="p-6 text-xs text-ink-muted animate-pulse">Loading item details…</div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-xs text-red-700">{error ?? 'Item not found'}</p>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-ink-muted hover:underline">Close</button>
        )}
      </div>
    );
  }

  const title = (item.data['title'] as string | undefined) ?? item.primaryIdentifier ?? item.stockNumber ?? item.id;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-silver-100">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide">{item.categoryId}</p>
          <h2 className="text-base font-bold text-ink-body leading-tight">{title}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {lifecycleBadge(item.lifecycleStatus)}
            {listingBadge(item.listingStatus)}
            <span className="text-xs text-ink-muted">Stock #{item.stockNumber ?? '—'}</span>
            {item.primaryIdentifier && (
              <span className="text-xs text-ink-muted font-mono">{item.primaryIdentifier}</span>
            )}
            <span className="text-xs font-semibold text-ink-body">{formatPrice(item.priceCents)}</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-4 text-ink-faint hover:text-ink-body text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Readiness */}
        <section>
          <h3 className="text-xs font-semibold text-ink-body mb-2">Readiness</h3>
          <VehicleReadinessChecklist readiness={item.readiness} />
        </section>

        {/* Media thumbnails */}
        {item.media.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Media ({item.media.length})</h3>
            <div className="flex gap-2 flex-wrap">
              {item.media.map(m => (
                <div key={m.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-silver-200 bg-silver-100">
                  <img src={m.url} alt={m.customLabel ?? m.mediaSlotKey ?? 'media'} className="w-full h-full object-cover" />
                  {m.mediaSlotKey && (
                    <span className="absolute bottom-0 left-0 right-0 bg-navy-900/70 text-white text-[9px] text-center py-0.5 truncate">
                      {m.mediaSlotKey}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category-specific fields (read-only view; editing needs a PATCH endpoint) */}
        {item.categoryId === 'EBOOKS' && ebookFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Book Details</h3>
            <EbookItemFields fields={ebookFields} onChange={setEbookFields} readOnly />
          </section>
        )}
        {item.categoryId === 'SONGS' && songFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Release Details</h3>
            <SongItemFields fields={songFields} onChange={setSongFields} readOnly />
          </section>
        )}
        {item.categoryId === 'DIGITAL_ART' && artFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Artwork Details</h3>
            <DigitalArtItemFields fields={artFields} onChange={setArtFields} readOnly />
          </section>
        )}
        {item.categoryId === 'VIDEO_DISTRIBUTION' && videoFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Video Details</h3>
            <VideoItemFields fields={videoFields} onChange={setVideoFields} readOnly />
          </section>
        )}

        {/* Publishing */}
        {item.lifecycleStatus === 'AVAILABLE' && (
          <section className="border border-silver-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-ink-body mb-3">Publishing</h3>
            <CategoryItemPublishPanel
              dealerId={dealerId}
              categoryItemId={item.id}
              listingStatus={item.listingStatus}
            />
          </section>
        )}

        {/* Timestamps */}
        <section className="border-t border-silver-100 pt-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-ink-muted">
            <span>Created</span>
            <span>{new Date(item.createdAt).toLocaleString()}</span>
            <span>Updated</span>
            <span>{new Date(item.updatedAt).toLocaleString()}</span>
            {item.soldAt && (
              <>
                <span>Sold</span>
                <span>{new Date(item.soldAt).toLocaleString()}</span>
              </>
            )}
            {item.removedAt && (
              <>
                <span>Removed</span>
                <span>{new Date(item.removedAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
