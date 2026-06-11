import { SectionCard } from '@/components/operator';
import type { SalesTrendPointDto } from '@/types/dashboardDto.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function formatCurrency(val: number) {
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
  return `$${val}`;
}

export function SalesOverTime({ data, nav }: { data: SalesTrendPointDto[]; nav?: OperatorNavHandlers }) {
  const action = nav ? (
    <button onClick={() => nav.goToReports()} className="text-blue-600 hover:underline text-xs flex items-center font-medium">
      View Reports <span className="ml-1">→</span>
    </button>
  ) : undefined;

  return (
    <SectionCard title="Sales Trend" subtitle="Revenue over the past 7 days." action={action}>
      <div className="h-[250px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              tickFormatter={formatCurrency}
              dx={-10}
            />
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#4f46e5" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
