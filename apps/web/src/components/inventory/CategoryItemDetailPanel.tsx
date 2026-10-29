import { useEffect, useState, useCallback } from 'react';
import { fetchCategoryItemDetail, patchCategoryItem, type CategoryInventoryItemDetail } from '@/lib/api/sdk.ts';
import { VehicleReadinessChecklist } from './VehicleReadinessChecklist.tsx';
import { isPhysicalRecordMerchandise } from '@auto-dealer/category-schemas';
import { ApparelItemFields, apparelFieldsFromData, apparelFieldsToData, type ApparelFields } from './ApparelItemFields.tsx';
import { EbookItemFields, ebookFieldsFromData, ebookFieldsToData, type EbookFields } from './EbookItemFields.tsx';
import { PhysicalRecordItemFields, physicalRecordFieldsFromData, physicalRecordFieldsToData, type PhysicalRecordFields } from './PhysicalRecordItemFields.tsx';
import { SongItemFields, songFieldsFromData, songFieldsToData, type SongFields } from './SongItemFields.tsx';
import { DigitalArtItemFields, digitalArtFieldsFromData, digitalArtFieldsToData, type DigitalArtFields } from './DigitalArtItemFields.tsx';
import { VideoItemFields, videoFieldsFromData, videoFieldsToData, type VideoFields } from './VideoItemFields.tsx';
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
  if (status === 'SOLD')    return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-700">Sold</span>;
  if (status === 'REMOVED') return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-silver-100 text-ink-muted">Removed</span>;
  return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-100 text-green-700">Available</span>;
}

function listingBadge(status: string) {
  if (status === 'READY') return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-navy-100 text-navy-700">Approved for channels</span>;
  return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-silver-100 text-ink-muted">Lot only (Draft)</span>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function CategoryItemDetailPanel({ dealerId, itemId, onClose }: Props) {
  const [item, setItem] = useState<CategoryInventoryItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-category editable fields
  const [ebookFields, setEbookFields] = useState<EbookFields | null>(null);
  const [apparelFields, setApparelFields] = useState<ApparelFields | null>(null);
  const [recordFields, setRecordFields] = useState<PhysicalRecordFields | null>(null);
  const [songFields, setSongFields] = useState<SongFields | null>(null);
  const [artFields, setArtFields] = useState<DigitalArtFields | null>(null);
  const [videoFields, setVideoFields] = useState<VideoFields | null>(null);

  // Top-level editable fields
  const [priceInput, setPriceInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');

  // Save state
  const [detailTab, setDetailTab] = useState<'overview' | 'details' | 'publish'>('overview');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const loadItem = useCallback((id: string) => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItem(null);
    setEbookFields(null);
    setApparelFields(null);
    setRecordFields(null);
    setSongFields(null);
    setArtFields(null);
    setVideoFields(null);
    setIsDirty(false);
    setSaveState('idle');
    fetchCategoryItemDetail(dealerId, id)
      .then(data => {
        if (cancelled) return;
        setItem(data);
        setPriceInput(data.priceCents != null ? String(data.priceCents / 100) : '');
        setConditionInput(data.condition ?? '');
        if (data.categoryId === 'EBOOKS') setEbookFields(ebookFieldsFromData(data.data));
        else if (data.categoryId === 'APPAREL') setApparelFields(apparelFieldsFromData(data.data));
        else if (data.categoryId === 'SONGS' && isPhysicalRecordMerchandise(data.condition, data.data)) setRecordFields(physicalRecordFieldsFromData(data.data));
        else if (data.categoryId === 'SONGS') setSongFields(songFieldsFromData(data.data));
        else if (data.categoryId === 'DIGITAL_ART') setArtFields(digitalArtFieldsFromData(data.data));
        else if (data.categoryId === 'VIDEO_DISTRIBUTION') setVideoFields(videoFieldsFromData(data.data));
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dealerId]);

  useEffect(() => loadItem(itemId), [itemId, loadItem]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const handleSave = async () => {
    if (!item || saveState === 'saving') return;
    setSaveState('saving');
    setSaveError(null);

    try {
      // Build data payload from whichever category fields are active
      let data: Record<string, unknown> | undefined;
      if (item.categoryId === 'EBOOKS' && ebookFields) data = ebookFieldsToData(ebookFields);
      else if (item.categoryId === 'APPAREL' && apparelFields) data = apparelFieldsToData(apparelFields);
      else if (recordFields) data = physicalRecordFieldsToData(recordFields);
      else if (item.categoryId === 'SONGS' && songFields) data = songFieldsToData(songFields);
      else if (item.categoryId === 'DIGITAL_ART' && artFields) data = digitalArtFieldsToData(artFields);
      else if (item.categoryId === 'VIDEO_DISTRIBUTION' && videoFields) data = videoFieldsToData(videoFields);

      const priceCents = priceInput.trim()
        ? Math.round(parseFloat(priceInput) * 100)
        : undefined;

      const updated = await patchCategoryItem(dealerId, item.id, {
        ...(priceCents !== undefined && { priceCents }),
        ...(conditionInput.trim() && { condition: conditionInput.trim() }),
        ...(data !== undefined && { data }),
      });

      setItem(updated);
      setPriceInput(updated.priceCents != null ? String(updated.priceCents / 100) : '');
      setConditionInput(updated.condition ?? '');
      if (updated.categoryId === 'EBOOKS') setEbookFields(ebookFieldsFromData(updated.data));
      else if (updated.categoryId === 'APPAREL') setApparelFields(apparelFieldsFromData(updated.data));
      else if (updated.categoryId === 'SONGS' && isPhysicalRecordMerchandise(updated.condition, updated.data)) setRecordFields(physicalRecordFieldsFromData(updated.data));
      else if (updated.categoryId === 'SONGS') setSongFields(songFieldsFromData(updated.data));
      else if (updated.categoryId === 'DIGITAL_ART') setArtFields(digitalArtFieldsFromData(updated.data));
      else if (updated.categoryId === 'VIDEO_DISTRIBUTION') setVideoFields(videoFieldsFromData(updated.data));

      setIsDirty(false);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      setSaveState('error');
    }
  };

  if (loading) {
    return <div className="p-6 text-xs text-ink-muted animate-pulse">Loading item details…</div>;
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
  const isEditable = item.lifecycleStatus === 'AVAILABLE';
  const physicalMerchandise = item.categoryId === 'APPAREL' || recordFields != null;
  const digitalSong = item.categoryId === 'SONGS' && recordFields == null;
  const conditionOptions = physicalMerchandise
    ? [['NEW', 'New'], ['USED', 'Used'], ['VINTAGE', 'Vintage']]
    : digitalSong
      ? [['DIGITAL', 'Digital']]
      : [['NEW', 'New'], ['USED', 'Used'], ['LIKE_NEW', 'Like new'], ['GOOD', 'Good'], ['FAIR', 'Fair']];
  const inputCls = 'w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:bg-silver-50 disabled:text-ink-muted';

  return (
    <>
    <div className="flex flex-col h-full bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Hero Section */}
        <div className="relative">
          <img
            src={typeof item.data['image'] === 'string' ? item.data['image'] : 'https://via.placeholder.com/960x400'}
            alt={title}
            className="w-full h-64 object-cover"
          />
          <button
            onClick={() => alert('Primary action')}
            className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Publish
          </button>
        </div>
        {/* Specs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-sm font-medium text-gray-600">Price</span>
            <div className="text-lg font-semibold text-gray-800">{formatPrice(item.priceCents)}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-sm font-medium text-gray-600">Condition</span>
            <div className="text-lg font-semibold text-gray-800">{conditionInput || '—'}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-sm font-medium text-gray-600">Lifecycle</span>
            {lifecycleBadge(item.lifecycleStatus)}
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-sm font-medium text-gray-600">Listing</span>
            {listingBadge(item.listingStatus)}
          </div>
        </div>
        {/* Tabbed Content */}
        <div className="border-t">
          <div className="flex border-b border-silver-200" role="tablist" aria-label="Item sections">
            {([
              ['overview', 'Overview'],
              ['details', 'Details'],
              ['publish', 'Publish'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={detailTab === id}
                onClick={() => setDetailTab(id)}
                className={detailTab === id
                  ? 'border-b border-navy-950 px-4 py-2 text-sm font-semibold text-navy-950'
                  : 'border-b border-transparent px-4 py-2 text-sm text-ink-muted'}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="p-4">
            {detailTab === 'overview' && (
              <p>{typeof item.data['description'] === 'string' ? item.data['description'] : 'No description available.'}</p>
            )}
            {detailTab === 'details' && (
              <>
                {/* Existing editable fields – reuse the form elements */}
                {/* Condition */}
                <label className="block text-sm font-medium mb-1">Condition</label>
                <select
                  value={conditionInput}
                  onChange={e => { setConditionInput(e.target.value); markDirty(); }}
                  className="w-full border rounded p-1"
                >
                  {conditionOptions.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                {/* Price */}
                <label className="block text-sm font-medium mt-4 mb-1">Price ($)</label>
                <input
                  type="text"
                  value={priceInput}
                  onChange={e => { setPriceInput(e.target.value); markDirty(); }}
                  className="w-full border rounded p-1"
                />
                {/* Category specific fields */}
                {/* Render the appropriate field component */}
                {item.categoryId === 'EBOOKS' && ebookFields && (
                  <EbookItemFields fields={ebookFields} onChange={fields => { setEbookFields(fields); markDirty(); }} readOnly={!isEditable} />
                )}
                {item.categoryId === 'APPAREL' && apparelFields && (
                  <ApparelItemFields fields={apparelFields} onChange={fields => { setApparelFields(fields); markDirty(); }} readOnly={!isEditable} />
                )}
                {recordFields && (
                  <PhysicalRecordItemFields fields={recordFields} onChange={fields => { setRecordFields(fields); markDirty(); }} readOnly={!isEditable} />
                )}
                {songFields && (
                  <SongItemFields fields={songFields} onChange={fields => { setSongFields(fields); markDirty(); }} readOnly={!isEditable} />
                )}
                {artFields && (
                  <DigitalArtItemFields fields={artFields} onChange={fields => { setArtFields(fields); markDirty(); }} readOnly={!isEditable} />
                )}
                {videoFields && (
                  <VideoItemFields fields={videoFields} onChange={fields => { setVideoFields(fields); markDirty(); }} readOnly={!isEditable} />
                )}
              </>
            )}
            {detailTab === 'publish' && (
              <CategoryItemPublishPanel dealerId={dealerId} categoryItemId={item.id} listingStatus={item.listingStatus} />
            )}
          </div>
        </div>
        {/* Footer actions */}
        <div className="flex justify-end items-center p-2 border-t">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saveState === 'saving'}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 text-gray-600 hover:underline"
          >
            Close
          </button>
        </div>
      </div>
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

        {/* Core fields (price + condition) */}
        {isEditable && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Core Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Price ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={priceInput}
                  onChange={e => { setPriceInput(e.target.value); markDirty(); }}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Condition</label>
                <select
                  value={conditionInput}
                  onChange={e => { setConditionInput(e.target.value); markDirty(); }}
                  className={`${inputCls} bg-white`}
                >
                  <option value="">—</option>
                  {conditionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Category-specific fields */}
        {item.categoryId === 'APPAREL' && apparelFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Garment</h3>
            <ApparelItemFields fields={apparelFields} onChange={fields => { setApparelFields(fields); markDirty(); }} readOnly={!isEditable} />
          </section>
        )}
        {recordFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Physical record</h3>
            <PhysicalRecordItemFields fields={recordFields} onChange={fields => { setRecordFields(fields); markDirty(); }} readOnly={!isEditable} />
          </section>
        )}
        {item.categoryId === 'EBOOKS' && ebookFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Book Details</h3>
            <EbookItemFields
              fields={ebookFields}
              onChange={f => { setEbookFields(f); markDirty(); }}
              readOnly={!isEditable}
            />
          </section>
        )}
        {item.categoryId === 'SONGS' && songFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Release Details</h3>
            <SongItemFields
              fields={songFields}
              onChange={f => { setSongFields(f); markDirty(); }}
              readOnly={!isEditable}
            />
          </section>
        )}
        {item.categoryId === 'DIGITAL_ART' && artFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Artwork Details</h3>
            <DigitalArtItemFields
              fields={artFields}
              onChange={f => { setArtFields(f); markDirty(); }}
              readOnly={!isEditable}
            />
          </section>
        )}
        {item.categoryId === 'VIDEO_DISTRIBUTION' && videoFields && (
          <section>
            <h3 className="text-xs font-semibold text-ink-body mb-2">Video Details</h3>
            <VideoItemFields
              fields={videoFields}
              onChange={f => { setVideoFields(f); markDirty(); }}
              readOnly={!isEditable}
            />
          </section>
        )}

        {/* Save bar */}
        {isEditable && (
          <section className="sticky bottom-0 -mx-5 px-5 py-3 bg-white border-t border-silver-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!isDirty || saveState === 'saving'}
                className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-40 transition-colors"
              >
                {saveState === 'saving' ? 'Saving…' : 'Save changes'}
              </button>
              {saveState === 'saved' && (
                <span className="text-xs text-green-700 font-semibold">Saved</span>
              )}
              {saveState === 'error' && saveError && (
                <span className="text-xs text-red-700">{saveError}</span>
              )}
            </div>
          </section>
        )}

        {/* Publishing */}
        {item.lifecycleStatus === 'AVAILABLE' && !digitalSong && (
          <section className="border border-silver-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-ink-body mb-3">Listing</h3>
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
    </>
  );
}
