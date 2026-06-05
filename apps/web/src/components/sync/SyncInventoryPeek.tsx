import type { VehicleReadinessItem } from '@/lib/types.ts';
import { SectionCard } from '@/components/operator';

type Props = {
  blocked: VehicleReadinessItem[];
  warningCount: number;
  onOpenInventory: () => void;
};

export function SyncInventoryPeek({ blocked, warningCount, onOpenInventory }: Props) {
  if (blocked.length === 0 && warningCount === 0) return null;

  return (
    <SectionCard
      title="Inventory blockers"
      subtitle="Vehicles that must be fixed before platforms can update"
      action={
        <button
          type="button"
          onClick={onOpenInventory}
          className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
        >
          Open inventory →
        </button>
      }
    >
      {blocked.length > 0 && (
        <ul className="space-y-2">
          {blocked.slice(0, 3).map(v => (
            <li
              key={v.stockNumber}
              className="flex items-start gap-2 text-sm px-3 py-2 bg-red-50 border border-red-100 rounded-xl"
            >
              <span className="font-semibold text-red-800 shrink-0">{v.stockNumber}</span>
              <span className="text-red-700 text-xs leading-snug">
                {v.issues[0]?.message ?? 'Blocked until fixed'}
              </span>
            </li>
          ))}
          {blocked.length > 3 && (
            <p className="text-xs text-slate-500">+{blocked.length - 3} more blocked vehicles</p>
          )}
        </ul>
      )}

      {warningCount > 0 && blocked.length === 0 && (
        <p className="text-sm text-amber-800">
          {warningCount} vehicle{warningCount !== 1 ? 's' : ''} need review — check inventory before syncing.
        </p>
      )}
    </SectionCard>
  );
}
