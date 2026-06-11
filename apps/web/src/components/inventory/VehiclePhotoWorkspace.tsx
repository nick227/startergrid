import { useState } from 'react';
import { getMediaGuide } from '@auto-dealer/category-schemas';
import type { MediaSlot, BusinessCategoryId } from '@auto-dealer/category-schemas';
import type { VehicleMediaItem, VehicleReadinessDto } from '@/lib/api/sdk.ts';
import { MediaLibraryModal } from './MediaLibraryModal.tsx';

type Props = {
  dealerId: string;
  vehicleId: string;
  category: BusinessCategoryId;
  media: VehicleMediaItem[];
  readiness: VehicleReadinessDto;
  onAssigned: () => void;
};

function mainPhotoFallback(media: VehicleMediaItem[]): VehicleMediaItem | null {
  const priority = ['main-photo', 'front-quarter-driver', 'front', 'front-quarter-passenger'];
  for (const key of priority) {
    const m = media.find(item => item.mediaSlotKey === key);
    if (m) return m;
  }
  return media.find(m => m.mediaSlotKey) ?? media[0] ?? null;
}

const levelBadge: Record<string, string> = {
  REQUIRED:    'bg-red-50 text-red-500 border-red-200',
  RECOMMENDED: 'bg-amber-50 text-amber-600 border-amber-200',
  OPTIONAL:    'bg-silver-50 text-ink-faint border-silver-100',
};

const levelLabel: Record<string, string> = {
  REQUIRED:    'Required',
  RECOMMENDED: 'Rec.',
  OPTIONAL:    'Optional',
};

type SlotTarget = { slot: MediaSlot; assigned: VehicleMediaItem | null } | { gallery: true };

export function VehiclePhotoWorkspace({ dealerId, vehicleId, category, media, readiness, onAssigned }: Props) {
  const [modalTarget, setModalTarget] = useState<SlotTarget | null>(null);

  const guide = getMediaGuide(category);
  if (!guide) return <p className="text-xs text-ink-muted p-4">No media guide for this category.</p>;

  const assignedKeys = new Set(media.map(m => m.mediaSlotKey).filter(Boolean) as string[]);
  const minimumSet = new Set(guide.minimumPublishSet);

  const mainSlot = guide.slots.find(s => s.key === 'main-photo');
  const mainAssigned = media.find(m => m.mediaSlotKey === 'main-photo') ?? null;
  const mainFallback = !mainAssigned ? mainPhotoFallback(media) : null;
  const mainImage = mainAssigned ?? mainFallback;

  const groups = Object.entries(
    guide.slots
      .filter(s => s.key !== 'main-photo')
      .reduce<Record<string, MediaSlot[]>>((acc, slot) => {
        (acc[slot.group] ??= []).push(slot);
        return acc;
      }, {}),
  );

  const galleryImages = media.filter(m => !m.mediaSlotKey);

  return (
    <>
      <div className="space-y-5">
        {/* ── Main Photo ─────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-ink-faint uppercase tracking-widest">Main Photo</h3>
            <span className="text-[10px] text-ink-muted">{mainAssigned ? 'Assigned' : 'Using fallback'}</span>
          </div>
          <button
            type="button"
            onClick={() => setModalTarget(mainSlot ? { slot: mainSlot, assigned: mainAssigned } : { gallery: true })}
            className="group relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-silver-200 bg-surface-raised hover:border-navy-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
          >
            {mainImage ? (
              <img
                src={mainImage.url}
                alt="Main photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-faint">
                <span className="text-3xl">📷</span>
                <span className="text-xs font-medium">No main photo yet</span>
              </div>
            )}
            <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/20 transition-colors flex items-end justify-between p-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white/90 text-ink-heading">
                MAIN
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-navy-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {mainAssigned ? 'Change' : 'Assign'}
              </span>
            </div>
          </button>
        </div>

        {/* ── Named slot groups ─────────────────────────────────────────────── */}
        {groups.map(([group, slots]) => (
          <div key={group}>
            <h3 className="text-xs font-bold text-ink-faint uppercase tracking-widest mb-2">{group}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => {
                const assigned = media.find(m => m.mediaSlotKey === slot.key) ?? null;
                const isMissing = !assigned;
                const isRequired = minimumSet.has(slot.key);
                const missingRequired = isMissing && isRequired;
                const missingWarning = readiness.missingRequiredMediaSlots.includes(slot.key);

                return (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() => setModalTarget({ slot, assigned })}
                    className={`group relative rounded-lg overflow-hidden border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${
                      assignedKeys.has(slot.key)
                        ? 'border-green-200 hover:border-green-300'
                        : missingRequired || missingWarning
                          ? 'border-red-200 bg-red-50 hover:border-red-300'
                          : 'border-silver-200 bg-surface-raised hover:border-silver-300'
                    }`}
                  >
                    {/* Thumbnail or placeholder */}
                    <div className="aspect-video w-full bg-silver-100 overflow-hidden">
                      {assigned ? (
                        <img src={assigned.url} alt={slot.label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className={`text-lg ${missingRequired || missingWarning ? 'text-red-300' : 'text-silver-300'}`}>□</span>
                        </div>
                      )}
                    </div>
                    {/* Label bar */}
                    <div className="px-1.5 py-1 flex items-start justify-between gap-1 bg-white">
                      <span className="text-[10px] font-medium text-ink-body leading-tight text-left truncate">{slot.label}</span>
                      <span className={`shrink-0 text-[9px] font-semibold px-1 py-px rounded border ${levelBadge[slot.requiredLevel]}`}>
                        {levelLabel[slot.requiredLevel]}
                      </span>
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/10 transition-colors" />
                    <div className="absolute bottom-6 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-semibold px-1 py-px rounded bg-navy-900/80 text-white">
                        {assigned ? 'Change' : 'Add'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── Gallery Extras ────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-ink-faint uppercase tracking-widest">
              Gallery Extras{galleryImages.length > 0 ? ` (${galleryImages.length})` : ''}
            </h3>
            <button
              type="button"
              onClick={() => setModalTarget({ gallery: true })}
              className="text-[11px] font-semibold text-navy-700 hover:text-navy-900"
            >
              + Add photos
            </button>
          </div>
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5">
              {galleryImages.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModalTarget({ gallery: true })}
                  className="relative group aspect-video rounded overflow-hidden border border-silver-200 hover:border-silver-300 focus:outline-none"
                >
                  <img src={m.url} alt="Gallery" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/20 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setModalTarget({ gallery: true })}
              className="w-full rounded-lg border-2 border-dashed border-silver-200 p-4 text-xs text-ink-faint hover:border-silver-300 hover:text-ink-muted transition-colors"
            >
              No gallery photos yet — click to add
            </button>
          )}
        </div>

        {/* Readiness media hint */}
        {readiness.missingRequiredMediaSlots.length > 0 && (
          <p className="text-[11px] text-red-600">
            <span className="font-semibold">Missing required shots:</span>{' '}
            {readiness.missingRequiredMediaSlots.join(', ')}
          </p>
        )}
      </div>

      {modalTarget && (
        <MediaLibraryModal
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
