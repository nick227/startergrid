import { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { getMediaGuide } from '@auto-dealer/category-schemas';
import type { MediaSlot, BusinessCategoryId } from '@auto-dealer/category-schemas';
import type { VehicleMediaItem } from '@/lib/api/sdk.ts';
import {
  assignMediaSlot,
  uploadVehicleMedia,
  deleteVehicleMedia,
  renameVehicleMedia,
} from '@/lib/api/sdk.ts';

type Props = {
  dealerId: string;
  vehicleId: string;
  category: BusinessCategoryId;
  media: VehicleMediaItem[];
  onAssigned: () => void;
};

const MISC_GROUP = 'Miscellaneous';

type UploadProgress = {
  group: string;
  current: number;
  total: number;
} | null;

// ── Shared card frame ───────────────────────────────────────────────────────
// One visual card used by predefined slots and custom photos alike:
// 4:3 image area on top, single-line label footer below, ✕ remove on hover.

function PhotoCardFrame({
  url,
  isOver,
  isUploading,
  onImageClick,
  imageClickHint,
  onRemove,
  dragHandle,
  children,
}: {
  url: string | null;
  isOver?: boolean;
  isUploading?: boolean;
  onImageClick?: () => void;
  imageClickHint?: string;
  onRemove?: () => void;
  dragHandle?: Record<string, unknown>;
  children: React.ReactNode; // footer content
}) {
  return (
    <div
      className={`relative group/card w-full h-full flex flex-col rounded-xl overflow-hidden border-2 bg-white transition-all ${
        isOver
          ? 'border-navy-500 scale-105 shadow-elevation-3 z-10'
          : url
            ? 'border-silver-200 hover:border-navy-300 hover:shadow-sm'
            : 'border-silver-200 border-dashed bg-surface-raised hover:border-silver-300 hover:border-solid'
      }`}
    >
      <button
        type="button"
        onClick={onImageClick}
        disabled={!onImageClick}
        {...(dragHandle ?? {})}
        className="aspect-[4/3] w-full bg-silver-100 overflow-hidden relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
      >
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
            <span className="text-2xl text-silver-300">{isOver ? '📥' : '📷'}</span>
            {isOver && <span className="text-[10px] font-bold text-navy-600">Drop to assign</span>}
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-navy-600 border-t-transparent" />
          </div>
        )}
        {onImageClick && (
          <>
            <div className="absolute inset-0 bg-navy-950/0 group-hover/card:bg-navy-950/10 transition-colors" />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-navy-900/90 backdrop-blur text-white shadow-sm">
                {imageClickHint ?? (url ? 'Change' : 'Add')}
              </span>
            </div>
          </>
        )}
      </button>
      {url && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove photo"
          className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-navy-900/80 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover/card:opacity-100 hover:bg-red-600 transition-all"
        >
          ✕
        </button>
      )}
      <div className="px-3 py-2 border-t border-silver-100 bg-white grow w-full flex items-center min-h-[34px]">
        {children}
      </div>
    </div>
  );
}

// ── Predefined slot card ────────────────────────────────────────────────────

function SlotCard({
  slot,
  assigned,
  optimisticUrl,
  onUploadClick,
  onRemove,
  isUploading,
}: {
  slot: MediaSlot;
  assigned: VehicleMediaItem | null;
  optimisticUrl: string | null;
  onUploadClick: () => void;
  onRemove: (mediaId: string) => void;
  isUploading: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: slot.key,
    data: { type: 'slot', slotKey: slot.key },
  });
  const url = assigned?.url ?? optimisticUrl;

  return (
    <div ref={setNodeRef} className="h-full">
      <PhotoCardFrame
        url={url}
        isOver={isOver}
        isUploading={isUploading}
        onImageClick={onUploadClick}
        onRemove={assigned ? () => onRemove(assigned.id) : undefined}
      >
        <p className="text-[11px] font-bold text-ink-heading leading-tight truncate">{slot.label}</p>
      </PhotoCardFrame>
    </div>
  );
}

// ── Custom photo card (user-added, renamable, draggable onto slots) ─────────

function CustomCard({
  m,
  onRename,
  onRemove,
}: {
  m: VehicleMediaItem;
  onRename: (mediaId: string, label: string) => void;
  onRemove: (mediaId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: m.id });

  const label = m.customLabel?.trim() || 'Untitled photo';

  const startEdit = () => {
    setDraft(m.customLabel ?? '');
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== (m.customLabel ?? '')) onRename(m.id, next);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      className="h-full"
    >
      <PhotoCardFrame
        url={m.url}
        onImageClick={() => {}}
        imageClickHint="Drag to a slot"
        onRemove={() => onRemove(m.id)}
        dragHandle={{ ...attributes, ...listeners }}
      >
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
            maxLength={120}
            placeholder="Name this photo…"
            className="w-full text-[11px] font-bold text-ink-heading bg-silver-50 border border-silver-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-navy-400"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            title="Rename photo"
            className="flex items-center gap-1.5 min-w-0 text-left group/label"
          >
            <p className={`text-[11px] font-bold leading-tight truncate ${m.customLabel ? 'text-ink-heading' : 'text-ink-muted italic'}`}>
              {label}
            </p>
            <span className="text-[10px] text-ink-muted opacity-0 group-hover/label:opacity-100 transition-opacity shrink-0">✎</span>
          </button>
        )}
      </PhotoCardFrame>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function VehiclePhotoWorkspace({ dealerId, vehicleId, category, media, onAssigned }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const slotFileInputRef = useRef<HTMLInputElement>(null);
  const groupFileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadSlotRef = useRef<MediaSlot | null>(null);
  const activeUploadGroupRef = useRef<string | null>(null);
  const [uploadingSlotKey, setUploadingSlotKey] = useState<string | null>(null);
  const [uploadingGroup, setUploadingGroup] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Optimistic previews: slotKey → blob URL. Shown instantly on file select.
  const [optimisticPreviews, setOptimisticPreviews] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const guide = getMediaGuide(category);
  if (!guide) return <p className="text-sm text-ink-muted p-6 text-center border-2 border-dashed rounded-xl border-silver-200">No media guide available for this category.</p>;

  // Latest media wins if multiple share a slot key (media arrives sorted by sortOrder asc).
  const getSlotMedia = (slotKey: string): VehicleMediaItem | null => {
    const matches = media.filter(m => m.mediaSlotKey === slotKey);
    return matches.length > 0 ? matches[matches.length - 1] : null;
  };

  const getOptimisticUrl = (slotKey: string): string | null => {
    if (getSlotMedia(slotKey) && optimisticPreviews[slotKey]) {
      URL.revokeObjectURL(optimisticPreviews[slotKey]);
      setTimeout(() => setOptimisticPreviews(prev => {
        const next = { ...prev };
        delete next[slotKey];
        return next;
      }), 0);
      return null;
    }
    return optimisticPreviews[slotKey] ?? null;
  };

  // ── Slot upload (single file into one named slot) ─────────────────────────

  const handleSlotClick = (slot: MediaSlot) => {
    activeUploadSlotRef.current = slot;
    setUploadError(null);
    slotFileInputRef.current?.click();
  };

  const handleSlotFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const slot = activeUploadSlotRef.current;
    if (!files || files.length === 0 || !slot) return;

    const previewUrl = URL.createObjectURL(files[0]);
    setOptimisticPreviews(prev => ({ ...prev, [slot.key]: previewUrl }));
    setUploadingSlotKey(slot.key);

    const replaced = getSlotMedia(slot.key);

    try {
      const result = await uploadVehicleMedia(dealerId, vehicleId, [files[0]], slot.key);
      const firstMedia = result.media[0];
      if (firstMedia) {
        await assignMediaSlot(dealerId, vehicleId, firstMedia.id, slot.key);
        // Move the previous occupant out of the slot (it lands in Miscellaneous)
        if (replaced) await assignMediaSlot(dealerId, vehicleId, replaced.id, null);
      }
      onAssigned();
    } catch (err) {
      console.error('Failed to upload and assign slot', err);
      setUploadError('Upload failed — please try again.');
      URL.revokeObjectURL(previewUrl);
      setOptimisticPreviews(prev => {
        const next = { ...prev };
        delete next[slot.key];
        return next;
      });
    } finally {
      setUploadingSlotKey(null);
      activeUploadSlotRef.current = null;
      if (slotFileInputRef.current) slotFileInputRef.current.value = '';
    }
  };

  // ── Section batch upload (multi-select; fills empty slots, overflows to custom cards) ──

  const handleAddPhotosClick = (group: string) => {
    activeUploadGroupRef.current = group;
    setUploadError(null);
    groupFileInputRef.current?.click();
  };

  const handleGroupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const group = activeUploadGroupRef.current;
    if (!fileList || fileList.length === 0 || !group) return;
    const files = Array.from(fileList);
    const emptySlots = guide.slots.filter(s => s.group === group && !getSlotMedia(s.key));

    setUploadingGroup(group);
    setUploadProgress({ group, current: 1, total: files.length });
    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const targetSlot = emptySlots[index] ?? null;
        setUploadProgress({ group, current: index + 1, total: files.length });

        let previewUrl: string | null = null;
        if (targetSlot) {
          const nextPreviewUrl = URL.createObjectURL(file);
          previewUrl = nextPreviewUrl;
          setOptimisticPreviews(prev => ({ ...prev, [targetSlot.key]: nextPreviewUrl }));
          setUploadingSlotKey(targetSlot.key);
        } else {
          setUploadingSlotKey(null);
        }

        try {
          const result = await uploadVehicleMedia(dealerId, vehicleId, [file], targetSlot?.key, group);
          const uploaded = result.media[0];
          if (uploaded && targetSlot) {
            await assignMediaSlot(dealerId, vehicleId, uploaded.id, targetSlot.key);
          }
          onAssigned();
        } catch (err) {
          if (previewUrl && targetSlot) {
            URL.revokeObjectURL(previewUrl);
            setOptimisticPreviews(prev => {
              const next = { ...prev };
              delete next[targetSlot.key];
              return next;
            });
          }
          throw err;
        }
      }
    } catch (err) {
      console.error('Failed to batch upload photos', err);
      setUploadError('Upload failed — please try again.');
    } finally {
      setUploadingGroup(null);
      setUploadingSlotKey(null);
      setUploadProgress(null);
      activeUploadGroupRef.current = null;
      if (groupFileInputRef.current) groupFileInputRef.current.value = '';
    }
  };

  // ── Remove / rename ────────────────────────────────────────────────────────

  const handleRemove = async (mediaId: string) => {
    try {
      await deleteVehicleMedia(dealerId, vehicleId, mediaId);
      onAssigned();
    } catch (err) {
      console.error('Failed to remove photo', err);
      setUploadError('Could not remove photo — please try again.');
    }
  };

  const handleRename = async (mediaId: string, label: string) => {
    try {
      await renameVehicleMedia(dealerId, vehicleId, mediaId, label || null);
      onAssigned();
    } catch (err) {
      console.error('Failed to rename photo', err);
      setUploadError('Could not rename photo — please try again.');
    }
  };

  // ── Grouping ───────────────────────────────────────────────────────────────

  const mainSlot = guide.slots.find(s => s.key === 'main-photo');

  const explicitOrder = ['Exterior', 'Interior', 'Detail'];
  const grouped = guide.slots
    .filter(s => s.key !== 'main-photo')
    .reduce<Record<string, MediaSlot[]>>((acc, slot) => {
      (acc[slot.group] ??= []).push(slot);
      return acc;
    }, {});

  const slotGroups = Object.entries(grouped).sort(([a], [b]) => {
    const ia = explicitOrder.indexOf(a);
    const ib = explicitOrder.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });

  const knownGroups = new Set(Object.keys(grouped));
  const customCardsFor = (group: string): VehicleMediaItem[] =>
    media.filter(m => {
      if (m.mediaSlotKey) return false;
      const g = m.customGroup && knownGroups.has(m.customGroup) ? m.customGroup : MISC_GROUP;
      return g === group;
    });

  // ── Drag & drop (custom cards → predefined slots) ──────────────────────────

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    if (over.data.current?.type === 'slot') {
      try {
        const replaced = getSlotMedia(String(over.id));
        await assignMediaSlot(dealerId, vehicleId, String(active.id), String(over.id));
        if (replaced && replaced.id !== String(active.id)) {
          await assignMediaSlot(dealerId, vehicleId, replaced.id, null);
        }
        onAssigned();
      } catch (e) {
        console.error('Failed to assign media to slot', e);
      }
    }
  };

  const activeMedia = activeId ? media.find(m => m.id === activeId) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderSection = (group: string, slots: MediaSlot[], description: string) => {
    const customs = customCardsFor(group);
    const isUploadingThisGroup = uploadingGroup === group;
    const progressLabel = isUploadingThisGroup && uploadProgress?.group === group
      ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
      : null;
    return (
      <section key={group} className="bg-silver-50 -mx-4 px-4 py-6 sm:-mx-6 sm:px-6 rounded-2xl border border-silver-100">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink-heading uppercase tracking-widest">{group}</h3>
            <p className="text-[11px] text-ink-muted mt-0.5">{description}</p>
          </div>
          <button
            type="button"
            onClick={() => handleAddPhotosClick(group)}
            disabled={isUploadingThisGroup}
            className="btn-primary-operator py-1.5 px-3 text-[11px] shrink-0 disabled:opacity-60"
          >
            {progressLabel ?? '+ Add Photos'}
          </button>
        </div>
        {progressLabel && (
          <div className="mb-3 rounded-lg border border-navy-100 bg-white px-3 py-2 text-[11px] font-semibold text-navy-700">
            {progressLabel}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {slots.map(slot => (
            <SlotCard
              key={slot.key}
              slot={slot}
              assigned={getSlotMedia(slot.key)}
              optimisticUrl={getOptimisticUrl(slot.key)}
              onUploadClick={() => handleSlotClick(slot)}
              onRemove={handleRemove}
              isUploading={uploadingSlotKey === slot.key}
            />
          ))}
          {customs.map(m => (
            <CustomCard key={m.id} m={m} onRename={handleRename} onRemove={handleRemove} />
          ))}
          {slots.length === 0 && customs.length === 0 && (
            <button
              type="button"
              onClick={() => handleAddPhotosClick(group)}
              disabled={isUploadingThisGroup}
              className="col-span-full rounded-xl border-2 border-dashed border-silver-200 p-8 text-center hover:border-navy-300 hover:bg-surface-raised transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 group disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="text-3xl mb-2 opacity-50 group-hover:opacity-100 transition-opacity">📸</div>
              <p className="text-sm font-bold text-ink-body group-hover:text-navy-700 transition-colors">No photos yet</p>
              <p className="text-xs text-ink-muted mt-1">Click to upload photos to this section</p>
            </button>
          )}
        </div>
      </section>
    );
  };

  const mainSlotMedia = mainSlot ? getSlotMedia(mainSlot.key) : null;
  const mainSlotUrl = mainSlotMedia?.url ?? (mainSlot ? getOptimisticUrl(mainSlot.key) : null);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-10">

          {/* ── Main Photo ─────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-end justify-between mb-3 border-b border-silver-200 pb-2">
              <div>
                <h3 className="text-sm font-bold text-ink-heading">Main Photo</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">The primary hero image shown on the storefront.</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${mainSlotUrl ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {mainSlotUrl ? 'Assigned' : 'Fallback'}
              </span>
            </div>
            {mainSlot && (
              <div className="max-w-2xl">
                <SlotCard
                  slot={mainSlot}
                  assigned={mainSlotMedia}
                  optimisticUrl={getOptimisticUrl(mainSlot.key)}
                  onUploadClick={() => handleSlotClick(mainSlot)}
                  onRemove={handleRemove}
                  isUploading={uploadingSlotKey === mainSlot.key}
                />
              </div>
            )}
          </section>

          {/* ── Named slot groups ──────────────────────────────────────────── */}
          {slotGroups.map(([group, slots]) =>
            renderSection(group, slots, `Structured shots to complete the ${group.toLowerCase()} presentation.`)
          )}

          {/* ── Miscellaneous ──────────────────────────────────────────────── */}
          {renderSection(MISC_GROUP, [], 'Additional photos for this vehicle. Drag any card onto a slot above to assign it.')}

          {/* Upload error */}
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
              <p className="text-xs text-red-700 font-medium">{uploadError}</p>
              <button type="button" onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } })}>
          {activeMedia ? (
            <div className="aspect-[4/3] w-40 rounded-xl overflow-hidden border-2 border-navy-400 shadow-elevation-3 opacity-90">
              <img src={activeMedia.url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <input
        type="file"
        ref={slotFileInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/webp"
        onChange={handleSlotFileSelect}
      />
      <input
        type="file"
        ref={groupFileInputRef}
        className="hidden"
        multiple
        accept="image/jpeg, image/png, image/webp"
        onChange={handleGroupFileSelect}
      />
    </>
  );
}
