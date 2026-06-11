import { SectionCard } from '@/components/operator';
import type { InventoryValueSummaryDto } from '@/types/dashboardDto.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

function formatCurrency(val: number) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
  return `$${val}`;
}

export function InventoryValueSummary({ data, nav }: { data: InventoryValueSummaryDto; nav?: OperatorNavHandlers }) {
  const action = nav ? (
    <button onClick={() => nav.goToInventory()} className="text-blue-600 hover:underline text-xs flex items-center font-medium">
      Explore Inventory <span className="ml-1">→</span>
    </button>
  ) : undefined;

  return (
    <SectionCard title="Inventory Value & Aging" subtitle="Current status of your active inventory." action={action}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Active</div>
          <div className="text-2xl font-bold font-mono text-slate-800">{data.activeCount}</div>
          <div className="text-xs font-semibold text-emerald-600 mt-1 bg-emerald-50 inline-block px-1.5 py-0.5 rounded">{formatCurrency(data.activeValue)}</div>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Aging</div>
          <div className="text-2xl font-bold font-mono text-amber-900">{data.agingCount}</div>
          <div className="text-xs text-amber-700 mt-1">30-45 days</div>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Stale</div>
          <div className="text-2xl font-bold font-mono text-orange-900">{data.staleCount}</div>
          <div className="text-xs text-orange-700 mt-1">45+ days</div>
        </div>
        <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Pending Removal</div>
          <div className="text-2xl font-bold font-mono text-slate-800">{data.soldPendingRemovalCount}</div>
          <div className="text-xs text-slate-500 mt-1">Sold but active</div>
        </div>
      </div>
    </SectionCard>
  );
}
