import { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { getMediaGuide } from '@auto-dealer/category-schemas';
import type { MediaSlot, BusinessCategoryId } from '@auto-dealer/category-schemas';
import type { VehicleMediaItem, VehicleReadinessDto } from '@/lib/api/sdk.ts';
import { FileLibraryModal } from '../generic/FileLibraryModal.tsx';
import { assignMediaSlot, uploadVehicleMedia } from '@/lib/api/sdk.ts';

type Props = {
  dealerId: string;
  vehicleId: string;
  category: BusinessCategoryId;
  media: VehicleMediaItem[];
  readiness: VehicleReadinessDto;
  onAssigned: () => void;
};

type SlotTarget = { slot: MediaSlot; assigned: VehicleMediaItem | null } | { gallery: true };

const levelBadge: Record<string, string> = {
  REQUIRED:    'bg-red-50 text-red-600 border-red-200',
  RECOMMENDED: 'bg-amber-50 text-amber-700 border-amber-200',
  OPTIONAL:    'bg-silver-100 text-ink-muted border-silver-200',
};

const levelLabel: Record<string, string> = {
  REQUIRED:    'Required',
  RECOMMENDED: 'Rec.',
  OPTIONAL:    'Optional',
};

// ── Sortable Gallery Item ───────────────────────────────────────────────────

function GalleryItem({
  m,
  onClick,
  isDragging,
}: {
  m: VehicleMediaItem;
  onClick?: () => void;
  isDragging?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative group aspect-video rounded-xl overflow-hidden border-2 focus:outline-none transition-all ${
        isDragging
          ? 'border-navy-400 shadow-elevation-3 scale-105 z-50 opacity-90'
          : 'border-silver-200 hover:border-navy-300 hover:shadow-sm bg-white'
      }`}
    >
      <img src={m.url} alt="Gallery" className="w-full h-full object-cover" />
      {!isDragging && (
        <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/20 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 text-xs font-bold bg-navy-900/90 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all transform translate-y-2 group-hover:translate-y-0">
            Edit
          </span>
        </div>
      )}
    </button>
  );
}

function SortableGalleryItem({ m, onClick }: { m: VehicleMediaItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <GalleryItem m={m} onClick={onClick} />
    </div>
  );
}

// ── Droppable Slot Item ─────────────────────────────────────────────────────

function SlotItem({
  slot,
  assigned,
  isRequired,
  missingWarning,
  onClick,
  isOver,
}: {
  slot: MediaSlot;
  assigned: VehicleMediaItem | null;
  isRequired: boolean;
  missingWarning: boolean;
  onClick: () => void;
  isOver?: boolean;
}) {
  const missingRequired = !assigned && isRequired;
  const showWarning = missingRequired || missingWarning;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative rounded-xl overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 flex flex-col bg-white ${
        isOver
          ? 'border-navy-500 scale-105 shadow-elevation-3 z-10'
          : assigned
            ? 'border-green-200 hover:border-green-300 hover:shadow-sm'
            : showWarning
              ? 'border-red-200 bg-red-50 hover:border-red-300'
              : 'border-silver-200 border-dashed bg-surface-raised hover:border-silver-300 hover:border-solid'
      }`}
    >
      <div className="aspect-video w-full bg-silver-100 overflow-hidden relative">
        {assigned ? (
          <img src={assigned.url} alt={slot.label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
            <span className={`text-2xl ${showWarning ? 'text-red-300' : 'text-silver-300'}`}>
              {isOver ? '📥' : '📷'}
            </span>
            {isOver && <span className="text-[10px] font-bold text-navy-600">Drop to assign</span>}
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/10 transition-colors" />
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-navy-900/90 backdrop-blur text-white shadow-sm">
            {assigned ? 'Change' : 'Add'}
          </span>
        </div>
      </div>
      <div className="px-3 py-2 flex items-start justify-between gap-2 border-t border-silver-100 bg-white grow w-full">
        <div className="min-w-0 text-left">
          <p className="text-[11px] font-bold text-ink-heading leading-tight truncate">{slot.label}</p>
          <p className="text-[9px] text-ink-muted mt-0.5 line-clamp-1">{slot.helpText ?? 'Best shot'}</p>
        </div>
        <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${levelBadge[slot.requiredLevel]}`}>
          {levelLabel[slot.requiredLevel]}
        </span>
      </div>
    </button>
  );
}

function DroppableSlot({
  slot,
  assigned,
  isRequired,
  missingWarning,
  onClick,
}: {
  slot: MediaSlot;
  assigned: VehicleMediaItem | null;
  isRequired: boolean;
  missingWarning: boolean;
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: slot.key,
    data: { type: 'slot', slotKey: slot.key },
  });

  return (
    <div ref={setNodeRef} className="h-full">
      <SlotItem
        slot={slot}
        assigned={assigned}
        isRequired={isRequired}
        missingWarning={missingWarning}
        onClick={onClick}
        isOver={isOver}
      />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function VehiclePhotoWorkspace({ dealerId, vehicleId, category, media, readiness, onAssigned }: Props) {
  const [modalTarget, setModalTarget] = useState<SlotTarget | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadSlot, setActiveUploadSlot] = useState<MediaSlot | null>(null);
  const [, setIsUploading] = useState(false);

  const handleSlotClick = (slot: MediaSlot) => {
    setActiveUploadSlot(slot);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeUploadSlot) return;

    setIsUploading(true);
    try {
      const result = await uploadVehicleMedia(dealerId, vehicleId, Array.from(files), activeUploadSlot.key);
      if (result.media.length > 0) {
        onAssigned();
      }
    } catch (err) {
      console.error('Failed to upload and assign slot', err);
    } finally {
      setIsUploading(false);
      setActiveUploadSlot(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const guide = getMediaGuide(category);
  if (!guide) return <p className="text-sm text-ink-muted p-6 text-center border-2 border-dashed rounded-xl border-silver-200">No media guide available for this category.</p>;

  const minimumSet = new Set(guide.minimumPublishSet);

  const mainSlot = guide.slots.find(s => s.key === 'main-photo');
  const mainAssigned = media.find(m => m.mediaSlotKey === 'main-photo') ?? null;

  // Grouping logic with explicit ordering
  const explicitOrder = ['Exterior', 'Interior', 'Details', 'Condition'];
  const grouped = guide.slots
    .filter(s => s.key !== 'main-photo')
    .reduce<Record<string, MediaSlot[]>>((acc, slot) => {
      (acc[slot.group] ??= []).push(slot);
      return acc;
    }, {});
    
  const groups = Object.entries(grouped).sort(([a], [b]) => {
    const ia = explicitOrder.indexOf(a);
    const ib = explicitOrder.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });

  const galleryImages = media.filter(m => !m.mediaSlotKey);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Dragged image ID
    const mediaId = active.id;

    // Dropped on a slot
    if (over.data.current?.type === 'slot') {
      const slotKey = over.id;
      // Optimistic or waiting? Let's just fire and reload
      try {
        await assignMediaSlot(dealerId, vehicleId, mediaId, slotKey);
        onAssigned();
      } catch (e) {
        console.error('Failed to assign media to slot', e);
      }
    } 
    // Dropped in gallery area to clear slot (if we want to support this, we'd add a droppable for gallery)
    // Or sorted within gallery
    else if (active.id !== over.id) {
      // For full order persistence, we would need an API. 
      // For now, sorting visually requires a local state override. 
      // Given API constraints, we will leave sorting as a visual stub until API supports `sortOrder`.
      console.log('Sort gallery items:', active.id, '->', over.id);
    }
  };

  const activeMedia = activeId ? media.find(m => m.id === activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-10">
          
          {/* ── Main Photo ─────────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-end justify-between mb-3 border-b border-silver-200 pb-2">
              <div>
                <h3 className="text-sm font-bold text-ink-heading">Main Photo</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">The primary hero image shown on the storefront.</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${mainAssigned ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {mainAssigned ? 'Assigned' : 'Fallback'}
              </span>
            </div>
            
            {mainSlot && (
              <div className="max-w-2xl">
                <DroppableSlot
                  slot={mainSlot}
                  assigned={mainAssigned}
                  isRequired={minimumSet.has('main-photo')}
                  missingWarning={readiness.missingRequiredMediaSlots.includes('main-photo')}
                  onClick={() => handleSlotClick(mainSlot)}
                />
              </div>
            )}
          </section>

          {/* ── Named slot groups ─────────────────────────────────────────────── */}
          {groups.map(([group, slots]) => (
            <section key={group} className="bg-silver-50 -mx-4 px-4 py-6 sm:-mx-6 sm:px-6 rounded-2xl border border-silver-100">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-ink-heading uppercase tracking-widest">{group}</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Structured shots to complete the {group.toLowerCase()} presentation.</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {slots.map(slot => {
                  const assigned = media.find(m => m.mediaSlotKey === slot.key) ?? null;
                  const isRequired = minimumSet.has(slot.key);
                  const missingWarning = readiness.missingRequiredMediaSlots.includes(slot.key);

                  return (
                    <DroppableSlot
                      key={slot.key}
                      slot={slot}
                      assigned={assigned}
                      isRequired={isRequired}
                      missingWarning={missingWarning}
                      onClick={() => handleSlotClick(slot)}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {/* ── Gallery Extras ────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-end justify-between mb-4 border-b border-silver-200 pb-2">
              <div>
                <h3 className="text-sm font-bold text-ink-heading">
                  Gallery Extras <span className="text-ink-muted font-normal ml-1">({galleryImages.length})</span>
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Additional photos not assigned to specific slots. Drag to a slot above to assign.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalTarget({ gallery: true })}
                className="btn-primary-operator py-1.5 px-3 text-[11px]"
              >
                + Add Photos
              </button>
            </div>

            {galleryImages.length > 0 ? (
              <SortableContext items={galleryImages.map(m => m.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {galleryImages.map(m => (
                    <SortableGalleryItem
                      key={m.id}
                      m={m}
                      onClick={() => setModalTarget({ gallery: true })}
                    />
                  ))}
                </div>
              </SortableContext>
            ) : (
              <button
                type="button"
                onClick={() => setModalTarget({ gallery: true })}
                className="w-full rounded-xl border-2 border-dashed border-silver-200 p-8 text-center hover:border-navy-300 hover:bg-surface-raised transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 group"
              >
                <div className="text-3xl mb-2 opacity-50 group-hover:opacity-100 transition-opacity">📸</div>
                <p className="text-sm font-bold text-ink-body group-hover:text-navy-700 transition-colors">No gallery photos yet</p>
                <p className="text-xs text-ink-muted mt-1">Click to upload or drag files here</p>
              </button>
            )}
          </section>

          {/* Readiness media hint */}
          {readiness.missingRequiredMediaSlots.length > 0 && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700">
                <span className="font-bold">Missing required shots to publish:</span>{' '}
                {readiness.missingRequiredMediaSlots.join(', ')}
              </p>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } })}>
          {activeMedia ? <GalleryItem m={activeMedia} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/webp"
        onChange={handleFileSelect}
      />

      {modalTarget && (
        <FileLibraryModal
          dealerId={dealerId}
          vehicleId={vehicleId}
          slot={'slot' in modalTarget ? modalTarget.slot : null}
          assigned={'slot' in modalTarget ? modalTarget.assigned : null}
          allMedia={media}
          onAssigned={() => { setModalTarget(null); onAssigned(); }}
          onClose={() => setModalTarget(null)}
        />
      )}
    </>
  );
}
