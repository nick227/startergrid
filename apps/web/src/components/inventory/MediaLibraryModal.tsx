import { useState } from 'react';
import type { MediaSlot } from '@auto-dealer/category-schemas';
import type { VehicleMediaItem } from '@/lib/api/sdk.ts';
import { assignMediaSlot, addVehicleMedia, deleteVehicleMedia } from '@/lib/api/sdk.ts';

type Props = {
  dealerId: string;
  vehicleId: string;
  slot: MediaSlot | null;
  assigned: VehicleMediaItem | null;
  allMedia: VehicleMediaItem[];
  onAssigned: () => void;
  onClose: () => void;
};

type Tab = 'gallery' | 'add-url';

export function MediaLibraryModal({ dealerId, vehicleId, slot, assigned, allMedia, onAssigned, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('gallery');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');

  const gallery = allMedia.filter(m => m.id !== assigned?.id);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onAssigned();
    } catch (e) {
      setError((e as Error).message || 'Something went wrong');
      setBusy(false);
    }
  };

  const handleAssign = (mediaId: string) =>
    run(() => assignMediaSlot(dealerId, vehicleId, mediaId, slot?.key ?? null));

  const handleUnassign = () =>
    assigned && run(() => assignMediaSlot(dealerId, vehicleId, assigned.id, null));

  const handleDelete = (mediaId: string) =>
    run(() => deleteVehicleMedia(dealerId, vehicleId, mediaId));

  const handleAddUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const { media: created } = await addVehicleMedia(dealerId, vehicleId, [trimmed]);
      if (slot && created[0]) {
        await assignMediaSlot(dealerId, vehicleId, created[0].id, slot.key);
      }
      setUrlInput('');
      onAssigned();
    } catch (e) {
      setError((e as Error).message || 'Failed to add photo');
      setBusy(false);
    }
  };

  const isGallerySlot = !slot;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-950/60 z-[60]"
        aria-hidden
        onClick={busy ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl z-[61] bg-white rounded-t-2xl sm:rounded-2xl shadow-elevation-3 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-silver-200 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-ink-heading">
              {slot ? slot.label : 'Gallery Photos'}
            </h3>
            {slot && (
              <p className="text-[11px] text-ink-muted mt-0.5">
                {slot.requiredLevel === 'REQUIRED' ? 'Required to publish' : slot.requiredLevel === 'RECOMMENDED' ? 'Recommended' : 'Optional'} · {slot.helpText ?? 'Assign the best image for this slot.'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-ink-muted hover:text-ink-heading text-sm w-7 h-7 flex items-center justify-center rounded hover:bg-silver-100"
          >
            ✕
          </button>
        </div>

        {/* Current assignment (non-gallery slots) */}
        {slot && assigned && (
          <div className="px-4 pt-3 pb-2 border-b border-silver-100 shrink-0">
            <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest mb-2">Current</p>
            <div className="flex items-center gap-3">
              <img src={assigned.url} alt="Current" className="w-20 h-14 object-cover rounded-lg border border-silver-200" />
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleUnassign}
                  className="text-[11px] font-semibold text-ink-muted hover:text-red-600 disabled:opacity-50"
                >
                  ✕ Clear slot
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(assigned.id)}
                  className="text-[11px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  🗑 Delete photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab bar */}
        {!isGallerySlot && (
          <div className="flex border-b border-silver-100 shrink-0">
            {(['gallery', 'add-url'] as Tab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-[11px] font-semibold border-b-2 transition-colors ${
                  tab === t ? 'border-navy-900 text-navy-900' : 'border-transparent text-ink-muted hover:text-ink-body'
                }`}
              >
                {t === 'gallery' ? 'Choose from Gallery' : 'Add by URL'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {error && (
            <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-600">{error}</div>
          )}

          {(tab === 'gallery' || isGallerySlot) && (
            <div className="space-y-3">
              {gallery.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">No photos in this vehicle's library yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map(m => {
                    const isCurrentSlot = m.mediaSlotKey != null && !isGallerySlot;
                    return (
                      <div key={m.id} className="relative group">
                        <button
                          type="button"
                          disabled={busy || isCurrentSlot}
                          onClick={() => !isGallerySlot && handleAssign(m.id)}
                          className={`w-full aspect-video rounded overflow-hidden border focus:outline-none ${
                            isCurrentSlot
                              ? 'border-green-300 opacity-60 cursor-default'
                              : 'border-silver-200 hover:border-navy-300 focus-visible:ring-2 focus-visible:ring-navy-400'
                          } ${busy ? 'opacity-50' : ''}`}
                        >
                          <img src={m.url} alt="Gallery" className="w-full h-full object-cover" />
                          {!isCurrentSlot && !isGallerySlot && (
                            <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/20 flex items-center justify-center transition-colors">
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold bg-navy-900/80 text-white px-2 py-0.5 rounded transition-opacity">
                                Assign
                              </span>
                            </div>
                          )}
                        </button>
                        {m.mediaSlotKey && (
                          <span className="absolute top-1 left-1 text-[9px] font-bold bg-navy-800/80 text-white px-1 py-px rounded truncate max-w-[70%]">
                            {m.mediaSlotKey}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(m.id)}
                          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-white/80 text-red-500 text-[10px] opacity-0 group-hover:opacity-100 hover:bg-white transition-opacity disabled:opacity-30"
                          aria-label="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'add-url' && !isGallerySlot && (
            <div className="space-y-3">
              <p className="text-xs text-ink-muted">
                Paste an image URL. The photo will be added to this vehicle and{slot ? ` assigned to the ${slot.label} slot.` : ' added to the gallery.'}
              </p>
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full border border-silver-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-navy-400"
                disabled={busy}
              />
              <button
                type="button"
                disabled={busy || !urlInput.trim()}
                onClick={handleAddUrl}
                className="w-full py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 disabled:opacity-50 transition-colors"
              >
                {busy ? 'Adding…' : 'Add Photo'}
              </button>

              {/* Scaffold: direct file upload note */}
              <div className="mt-2 p-3 bg-silver-50 border border-silver-100 rounded-lg">
                <p className="text-[11px] text-ink-muted">
                  <span className="font-semibold">Direct file upload</span> is being built — paste a URL for now.
                  Drag-and-drop upload will be added in the next media sprint.
                </p>
              </div>
            </div>
          )}

          {/* Gallery add URL */}
          {isGallerySlot && (
            <div className="mt-3 pt-3 border-t border-silver-100 space-y-2">
              <p className="text-xs font-semibold text-ink-body">Add by URL</p>
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full border border-silver-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-navy-400"
                disabled={busy}
              />
              <button
                type="button"
                disabled={busy || !urlInput.trim()}
                onClick={handleAddUrl}
                className="w-full py-2 rounded-lg bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 disabled:opacity-50 transition-colors"
              >
                {busy ? 'Adding…' : 'Add to Gallery'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
