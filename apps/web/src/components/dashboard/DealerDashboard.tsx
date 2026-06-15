import { useState, useEffect } from 'react';
import { generateMockDashboardData, type DashboardMockData } from '@/types/dashboardDto.ts';
import { FinancialSummaryStrip } from './FinancialSummaryStrip.tsx';
import { SalesByPlatform } from './SalesByPlatform.tsx';
import { InventoryValueSummary } from './InventoryValueSummary.tsx';
import { InsightCards } from './InsightCards.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

export function DealerDashboard({ dealerId, isAdmin, nav }: { dealerId?: string | null; isAdmin?: boolean; nav?: OperatorNavHandlers }) {
  const [data, setData] = useState<DashboardMockData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate network delay
    setLoading(true);
    const timer = setTimeout(() => {
      setData(generateMockDashboardData(dealerId));
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [dealerId]);

  if (loading || !data) {
    return (
      <div className="space-y-6 p-1">
        <div className="surface-card-operator p-6"><Skeleton rows={4} /></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-card-operator p-6"><Skeleton rows={8} /></div>
          <div className="surface-card-operator p-6"><Skeleton rows={8} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FinancialSummaryStrip data={data.financialSummary} isAdmin={isAdmin} />
      
      <InventoryValueSummary data={data.inventoryValue} nav={nav} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesByPlatform data={data.salesByPlatform} nav={nav} />
        <InsightCards data={data.insightCards} />
      </div>
    </div>
  );
}
