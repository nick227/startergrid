import { SectionCard } from '@/components/operator';
import type { SalesByInventorySegmentDto } from '@/types/dashboardDto.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

export function SalesByInventorySegment({ data, nav }: { data: SalesByInventorySegmentDto[]; nav?: OperatorNavHandlers }) {
  const action = nav ? (
    <button onClick={() => nav.goToInventory()} className="text-blue-600 hover:underline text-xs flex items-center font-medium">
      Explore Inventory <span className="ml-1">→</span>
    </button>
  ) : undefined;

  return (
    <SectionCard title="Sales by Inventory Segment" subtitle="Top performing year, make, model, trim groupings." action={action}>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all group">
            <div className="mb-3 sm:mb-0">
              <div className="font-semibold text-slate-800 text-sm group-hover:text-navy-700 transition-colors">{item.grouping}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Avg Price: <span className="font-mono text-slate-700">${item.averageSalePrice.toLocaleString()}</span></span>
                <span className="text-slate-300">•</span>
                <span>Days to Sale: <span className="font-mono text-slate-700">{item.averageDaysToSale}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Units</span>
                <span className="font-mono font-bold text-slate-800 text-lg leading-none mt-1">{item.unitsSold}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Messages</span>
                <span className="font-mono text-indigo-600 font-semibold text-lg leading-none mt-1">{item.messages}</span>
              </div>
              <div className="flex flex-col items-end min-w-[80px]">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Top Platform</span>
                <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mt-1">{item.bestPlatform}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
