import { SectionCard } from '@/components/operator';
import type { DealerFinancialSummaryDto } from '@/types/dashboardDto.ts';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

export function FinancialSummaryStrip({ data, isAdmin }: { data: DealerFinancialSummaryDto; isAdmin?: boolean }) {
  return (
    <SectionCard title="Financial Summary" subtitle={isAdmin ? "Global aggregate sales performance across all dealers." : "Your current sales performance."}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        <div className="flex flex-col p-6 bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <span className="text-sm font-medium text-slate-500 mb-2">Total Sales</span>
          <span className="text-3xl font-semibold tracking-tight text-slate-900">{formatCurrency(data.totalSales)}</span>
        </div>

        <div className="flex flex-col p-6 bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <span className="text-sm font-medium text-slate-500 mb-2">MTD Sales</span>
          <span className="text-3xl font-semibold tracking-tight text-slate-900">{formatCurrency(data.monthToDateSales)}</span>
          {data.conversionIndicator && (
            <div className="mt-auto pt-3">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                {data.conversionIndicator}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col p-6 bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <span className="text-sm font-medium text-slate-500 mb-2">Units Sold</span>
          <span className="text-3xl font-semibold tracking-tight text-slate-900">{data.unitsSold}</span>
          <span className="text-sm text-slate-500 mt-auto pt-2">Avg {formatCurrency(data.averageSalePrice)}</span>
        </div>

        <div className="flex flex-col p-6 bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <span className="text-sm font-medium text-slate-500 mb-2">Active Inventory Value</span>
          <span className="text-3xl font-semibold tracking-tight text-slate-900">{formatCurrency(data.activeInventoryValue)}</span>
          <span className="text-sm text-slate-500 mt-auto pt-2">{data.averageDaysToSale} days to sale avg</span>
        </div>
      </div>
    </SectionCard>
  );
}
