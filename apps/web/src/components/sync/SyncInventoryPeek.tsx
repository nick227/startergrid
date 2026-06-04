import type { VehicleReadinessItem } from '@/lib/types.ts';

type Props = {
  blocked: VehicleReadinessItem[];
  warningCount: number;
  onOpenInventory: () => void;
};

export function SyncInventoryPeek({ blocked, warningCount, onOpenInventory }: Props) {
  if (blocked.length === 0 && warningCount === 0) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Inventory to fix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Only vehicles blocking sync — open inventory for the full list.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenInventory}
          className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
        >
          Open inventory →
        </button>
      </div>

      {blocked.length > 0 && (
        <ul className="space-y-2">
          {blocked.slice(0, 3).map(v => (
            <li
              key={v.stockNumber}
              className="flex items-start gap-2 text-sm px-3 py-2 bg-red-50 border border-red-100 rounded-xl"
            >
              <span className="font-semibold text-red-800 shrink-0">{v.stockNumber}</span>
              <span className="text-red-700 text-xs leading-snug">
                {v.issues[0]?.message ?? 'Cannot sync until fixed'}
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
          {warningCount} vehicle{warningCount !== 1 ? 's' : ''} have warnings — review in inventory before syncing.
        </p>
      )}
    </section>
  );
}
