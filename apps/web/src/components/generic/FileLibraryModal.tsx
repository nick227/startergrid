import { useState } from 'react';
import type { MediaSlot } from '@auto-dealer/category-schemas';
import type { VehicleMediaItem } from '@/lib/api/sdk.ts';
import { assignMediaSlot, addVehicleMedia, deleteVehicleMedia, uploadVehicleMedia } from '@/lib/api/sdk.ts';

type Props = {
  dealerId: string;
  vehicleId: string;
  slot: MediaSlot | null;
  assigned: VehicleMediaItem | null;
  allMedia: VehicleMediaItem[];
  onAssigned: () => void;
  onClose: () => void;
};

type Tab = 'gallery' | 'upload';

export function FileLibraryModal({ dealerId, vehicleId, slot, assigned, allMedia, onAssigned, onClose }: Props) {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setBusy(true);
    setError(null);
    try {
      await uploadVehicleMedia(dealerId, vehicleId, Array.from(files), slot?.key);
      onAssigned();
    } catch (err) {
      setError((err as Error).message || 'Failed to upload files');
      setBusy(false);
    }
  };


  const isGallerySlot = !slot;

  return (
    <>
      <div
        className="fixed inset-0 bg-navy-950/60 z-[60] backdrop-blur-sm transition-all"
        aria-hidden
        onClick={busy ? undefined : onClose}
      />

      <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl z-[61] bg-white rounded-t-2xl sm:rounded-2xl shadow-elevation-4 flex flex-col max-h-[85vh] overflow-hidden border border-silver-200/50">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver-200 bg-surface-raised shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📁</span>
              <h3 className="text-base font-bold text-ink-heading">
                File Library {slot ? `· ${slot.label}` : ''}
              </h3>
            </div>
            <p className="text-[11px] text-ink-muted mt-1 max-w-sm leading-relaxed">
              {slot 
                ? (slot.helpText ?? 'Assign the best image for this slot from your library or upload a new one.') 
                : 'Manage files and media across your inventory. Access photos, CSVs, and documents.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-ink-muted hover:text-ink-heading text-sm w-8 h-8 flex items-center justify-center rounded-full hover:bg-silver-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {slot && assigned && (
          <div className="px-5 pt-4 pb-3 border-b border-silver-100 shrink-0 bg-white">
            <p className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-3">Currently Assigned</p>
            <div className="flex items-start gap-4 p-3 rounded-xl border border-silver-200 bg-silver-50">
              <img src={assigned.url} alt="Current" className="w-28 h-20 object-cover rounded-lg border border-silver-200 shadow-sm" />
              <div className="flex flex-col gap-2 justify-center h-20">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleUnassign}
                  className="text-xs font-semibold text-ink-body hover:text-red-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-lg leading-none">✕</span> Remove from {slot.label}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(assigned.id)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-lg leading-none">🗑</span> Delete file permanently
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex border-b border-silver-100 shrink-0 bg-white px-2">
          {(['gallery', 'upload'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wide border-b-2 transition-all ${
                tab === t ? 'border-navy-900 text-navy-900' : 'border-transparent text-ink-muted hover:text-ink-body'
              }`}
            >
              {t === 'gallery' ? 'Library Files' : 'Upload Files'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0 bg-silver-50">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">{error}</div>
          )}

          {tab === 'gallery' && (
            <div className="space-y-4">
              {gallery.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-4xl mb-3 opacity-50">📂</span>
                  <p className="text-sm font-medium text-ink-body">No files found</p>
                  <p className="text-xs text-ink-muted mt-1">Upload a file or add by URL to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {gallery.map(m => {
                    const isCurrentSlot = m.mediaSlotKey != null && !isGallerySlot;
                    return (
                      <div key={m.id} className="relative group">
                        <button
                          type="button"
                          disabled={busy || isCurrentSlot}
                          onClick={() => !isGallerySlot && handleAssign(m.id)}
                          className={`w-full aspect-square sm:aspect-video rounded-xl overflow-hidden border-2 bg-white transition-all focus:outline-none ${
                            isCurrentSlot
                              ? 'border-green-300 opacity-60 cursor-default'
                              : 'border-silver-200 hover:border-navy-400 hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy-500'
                          } ${busy ? 'opacity-50' : ''}`}
                        >
                          <img src={m.url} alt="Gallery" className="w-full h-full object-cover" />
                          {!isCurrentSlot && !isGallerySlot && (
                            <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/30 flex items-center justify-center transition-colors">
                              <span className="opacity-0 group-hover:opacity-100 text-xs font-bold bg-navy-900 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all transform translate-y-2 group-hover:translate-y-0">
                                Select
                              </span>
                            </div>
                          )}
                        </button>
                        {m.mediaSlotKey && (
                          <span className="absolute top-2 left-2 text-[10px] font-bold bg-navy-900/90 backdrop-blur text-white px-1.5 py-0.5 rounded-md truncate max-w-[80%] shadow-sm">
                            {m.mediaSlotKey}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(m.id)}
                          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white text-red-500 text-xs opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 shadow-sm transition-all disabled:opacity-30"
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

          {tab === 'upload' && (
            <div className="space-y-6 max-w-md mx-auto py-6">
              <div className="text-center mb-6">
                <span className="text-4xl mb-3 block">📥</span>
                <p className="text-sm font-medium text-ink-heading">Upload Local Files</p>
                <p className="text-xs text-ink-muted mt-1">
                  Select multiple images from your computer. They will be added to the gallery{slot ? ` and the first will be assigned to ${slot.label}.` : '.'}
                </p>
              </div>
              
              <div className="relative border-2 border-dashed border-silver-300 rounded-2xl p-8 hover:border-navy-400 hover:bg-surface-raised transition-all flex flex-col items-center justify-center text-center group">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={busy}
                />
                <span className="text-3xl mb-2 opacity-50 group-hover:opacity-100 transition-opacity">📸</span>
                <p className="text-sm font-bold text-navy-700">{busy ? 'Uploading...' : 'Click or Drag files here'}</p>
                <p className="text-[10px] text-ink-muted mt-2">JPEG, PNG, WEBP (Max 15MB)</p>
              </div>

              <div className="pt-6 mt-6 border-t border-silver-200">
                <p className="text-xs font-medium text-ink-heading mb-2">Or paste a URL</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 border border-silver-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 shadow-sm"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    disabled={busy || !urlInput.trim()}
                    onClick={handleAddUrl}
                    className="px-4 py-2 rounded-xl bg-navy-900 text-white text-sm font-bold hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
