import { SectionCard } from '@/components/operator';
import type { DealerInsightCardDto } from '@/types/dashboardDto.ts';

function InsightIcon({ type }: { type: DealerInsightCardDto['type'] }) {
  switch (type) {
    case 'positive':
      return <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">↑</div>;
    case 'negative':
      return <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">↓</div>;
    case 'warning':
      return <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">!</div>;
    default:
      return <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">i</div>;
  }
}

export function InsightCards({ data }: { data: DealerInsightCardDto[] }) {
  return (
    <SectionCard title="Actionable Insights" subtitle="AI-generated observations to optimize sales.">
      <div className="flex flex-col gap-3">
        {data.map((insight) => (
          <div key={insight.id} className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
            <InsightIcon type={insight.type} />
            <div className="text-sm font-medium text-slate-700">
              {insight.message}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
