import { SectionCard } from '@/components/operator';
import type { DealerFinancialSummaryDto } from '@/types/dashboardDto.ts';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

export function FinancialSummaryStrip({ data, isAdmin }: { data: DealerFinancialSummaryDto; isAdmin?: boolean }) {
  return (
    <SectionCard title="Financial Summary" subtitle={isAdmin ? "Global aggregate sales performance across all dealers." : "Your current sales performance."}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm font-semibold text-indigo-800 mb-1">Total Sales</div>
          <div className="text-3xl font-bold text-indigo-950 font-mono tracking-tight">{formatCurrency(data.totalSales)}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm font-semibold text-blue-800 mb-1">MTD Sales</div>
          <div className="text-2xl font-bold text-blue-950 font-mono tracking-tight">{formatCurrency(data.monthToDateSales)}</div>
          {data.conversionIndicator && <div className="text-[11px] font-semibold text-emerald-700 mt-2 bg-emerald-100 inline-block px-2 py-0.5 rounded-full border border-emerald-200">{data.conversionIndicator}</div>}
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm font-semibold text-slate-700 mb-1">Units Sold</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{data.unitsSold}</div>
          <div className="text-[11px] text-slate-500 mt-1">Avg {formatCurrency(data.averageSalePrice)}</div>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm font-semibold text-slate-700 mb-1">Active Inventory Value</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{formatCurrency(data.activeInventoryValue)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{data.averageDaysToSale} days to sale avg</div>
        </div>
      </div>
    </SectionCard>
  );
}
