import { SectionCard } from '@/components/operator';
import type { PlatformSalesBreakdownDto } from '@/types/dashboardDto.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

export function SalesByPlatform({ data, nav }: { data: PlatformSalesBreakdownDto[]; nav?: OperatorNavHandlers }) {
  const action = nav ? (
    <button onClick={() => nav.goToPlatforms()} className="text-blue-600 hover:underline text-xs flex items-center font-medium">
      Explore Platforms <span className="ml-1">→</span>
    </button>
  ) : undefined;

  return (
    <SectionCard title="Sales by Platform" subtitle="Performance breakdown by distribution channel." action={action}>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold">Units Sold</th>
              <th className="px-4 py-3 font-semibold">Revenue</th>
              <th className="px-4 py-3 font-semibold">Messages</th>
              <th className="px-4 py-3 font-semibold">Avg Days Online</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.platformSlug} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{item.platformName}</span>
                    {item.isTopPlatform && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">Top</span>
                    )}
                  </div>
                  {item.conversionHint && <div className="text-[10px] text-slate-500 mt-0.5">{item.conversionHint}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-slate-700">{item.soldUnits}</td>
                <td className="px-4 py-3 font-mono text-sm text-slate-700 font-semibold">{formatCurrency(item.soldRevenue)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
                    {item.messages}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm ${item.averageDaysOnline > 30 ? 'text-amber-600 font-medium' : 'text-slate-600'}`}>
                    {item.averageDaysOnline}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
