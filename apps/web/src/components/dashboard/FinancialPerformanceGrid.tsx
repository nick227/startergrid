import { useState, useMemo } from 'react';
import { SectionCard } from '@/components/operator';
import type { FinancialPerformanceRowDto } from '@/types/dashboardDto.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

type SortField = keyof FinancialPerformanceRowDto;
type SortDir = 'asc' | 'desc';

export function FinancialPerformanceGrid({ 
  data, 
  isAdmin,
  nav 
}: { 
  data: FinancialPerformanceRowDto[]; 
  isAdmin?: boolean;
  nav?: OperatorNavHandlers;
}) {
  const [sortField, setSortField] = useState<SortField>('daysOnline');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [data, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-slate-300 opacity-50 ml-1">↕</span>;
    return <span className="text-slate-700 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <SectionCard 
      title="Financial Performance by Item" 
      subtitle="Cross-referenceable detail view across vehicles and platforms."
    >
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
              {isAdmin && (
                <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 select-none" onClick={() => handleSort('dealerName')}>
                  Dealership <SortIcon field="dealerName" />
                </th>
              )}
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 select-none" onClick={() => handleSort('vehicleDescription')}>
                Vehicle <SortIcon field="vehicleDescription" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 select-none" onClick={() => handleSort('platformName')}>
                Platform <SortIcon field="platformName" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 select-none" onClick={() => handleSort('status')}>
                Status <SortIcon field="status" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 select-none text-right" onClick={() => handleSort('price')}>
                Price <SortIcon field="price" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 select-none text-right" onClick={() => handleSort('daysOnline')}>
                Days Online <SortIcon field="daysOnline" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 select-none text-right" onClick={() => handleSort('messages')}>
                Messages <SortIcon field="messages" />
              </th>
              <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 select-none text-right" onClick={() => handleSort('views')}>
                Views <SortIcon field="views" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                {isAdmin && (
                  <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                    {row.dealerName}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-slate-700">
                  <button 
                    onClick={() => nav?.goToInventory()}
                    className="hover:text-blue-600 hover:underline transition-colors text-left"
                  >
                    {row.vehicleDescription}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  <button 
                    onClick={() => nav?.goToPlatformDetail(row.platformSlug)}
                    className="hover:text-blue-600 hover:underline transition-colors text-left font-medium"
                  >
                    {row.platformName}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide
                    ${row.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : ''}
                    ${row.status === 'Sold' ? 'bg-slate-100 text-slate-600 border border-slate-200' : ''}
                    ${row.status === 'Pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : ''}
                  `}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-slate-800 text-right">
                  ${row.price.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-slate-600 text-right">
                  {row.daysOnline}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
                    {row.messages}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-slate-500 text-right">
                  {row.views.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
