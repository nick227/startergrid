import { getMediaGuide } from '@auto-dealer/category-schemas';
import type { MediaSlot } from '@auto-dealer/category-schemas';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import { assignMediaSlot } from '@/lib/api/sdk.ts';

type MediaItem = {
  id: string;
  url: string;
  mediaSlotKey: string | null;
};

type Props = {
  dealerId: string;
  vehicleId: string;
  category: BusinessCategoryId;
  media: MediaItem[];
  onAssigned?: () => void;
};

type SlotState = 'captured' | 'missing-required' | 'missing-optional' | 'gallery';

function slotState(slot: MediaSlot, assignedKeys: Set<string>, minimumSet: Set<string>): SlotState {
  if (assignedKeys.has(slot.key)) return 'captured';
  if (minimumSet.has(slot.key)) return 'missing-required';
  return 'missing-optional';
}

const slotColors: Record<SlotState, string> = {
  captured: 'border-green-300 bg-green-50',
  'missing-required': 'border-red-300 bg-red-50',
  'missing-optional': 'border-silver-200 bg-surface-raised',
  gallery: 'border-silver-200 bg-white',
};

const slotDot: Record<SlotState, string> = {
  captured: 'bg-green-500',
  'missing-required': 'bg-red-400',
  'missing-optional': 'bg-silver-300',
  gallery: 'bg-silver-300',
};

export function MediaSlotGrid({ dealerId, vehicleId, category, media, onAssigned }: Props) {
  const guide = getMediaGuide(category);

  if (!guide) {
    return (
      <p className="text-xs text-ink-muted">No media guide for this category.</p>
    );
  }

  const assignedKeys = new Set(media.map(m => m.mediaSlotKey).filter(Boolean) as string[]);
  const minimumSet = new Set(guide.minimumPublishSet);
  const unassignedMedia = media.filter(m => !m.mediaSlotKey);

  const groups = Object.entries(
    guide.slots.reduce<Record<string, MediaSlot[]>>((acc, slot) => {
      (acc[slot.group] ??= []).push(slot);
      return acc;
    }, {}),
  );

  const handleAssign = async (mediaId: string, slotKey: string | null) => {
    try {
      await assignMediaSlot(dealerId, vehicleId, mediaId, slotKey);
      onAssigned?.();
    } catch {
      // silently ignore — caller can reload on onAssigned
    }
  };

  return (
    <div className="space-y-5">
      {groups.map(([group, slots]) => (
        <div key={group}>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{group}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {slots.map(slot => {
              const state = slotState(slot, assignedKeys, minimumSet);
              const assignedMedia = media.find(m => m.mediaSlotKey === slot.key);
              return (
                <div
                  key={slot.key}
                  className={`relative rounded-lg border p-2 ${slotColors[state]}`}
                >
                  <div className="flex items-start gap-1.5">
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${slotDot[state]}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink-body truncate">{slot.label}</p>
                      {minimumSet.has(slot.key) && state !== 'captured' && (
                        <p className="text-[10px] text-red-500">Required to publish</p>
                      )}
                    </div>
                  </div>
                  {assignedMedia && (
                    <img
                      src={assignedMedia.url}
                      alt={slot.label}
                      className="mt-2 w-full aspect-video object-cover rounded"
                    />
                  )}
                  {!assignedMedia && unassignedMedia.length > 0 && (
                    <select
                      className="mt-2 w-full text-[10px] border border-silver-200 rounded px-1 py-0.5 bg-white"
                      defaultValue=""
                      onChange={e => { if (e.target.value) handleAssign(e.target.value, slot.key); }}
                    >
                      <option value="" disabled>Assign photo…</option>
                      {unassignedMedia.map(m => (
                        <option key={m.id} value={m.id}>{m.id.slice(-6)}</option>
                      ))}
                    </select>
                  )}
                  {assignedMedia && (
                    <button
                      type="button"
                      onClick={() => handleAssign(assignedMedia.id, null)}
                      className="mt-1 text-[10px] text-ink-muted hover:text-red-500"
                    >
                      Unassign
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {unassignedMedia.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Unassigned Photos ({unassignedMedia.length})</h4>
          <div className="flex flex-wrap gap-2">
            {unassignedMedia.map(m => (
              <img
                key={m.id}
                src={m.url}
                alt="Unassigned"
                className="w-20 h-14 object-cover rounded border border-silver-200"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
