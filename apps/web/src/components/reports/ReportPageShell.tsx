import type { ReactNode } from 'react';
import type { OperatorNavHandlers, OperatorTab } from '@/lib/operatorNav.ts';
import { OperatorPage } from '@/components/operator';
import { reportHubHash } from '@/lib/reportRoutes.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import type { ReportMetric } from '@/lib/reportMetrics.ts';
import { ReportSummaryMetrics } from '@/components/reports/ReportSummaryMetrics.tsx';

type Props = {
  dealerId: string;
  activeTab: OperatorTab;
  nav: OperatorNavHandlers;
  title: string;
  decision: string;
  metrics?: ReportMetric[];
  metricsLoading?: boolean;
  metricsColumns?: 2 | 3 | 4 | 5;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastRefresh?: Date;
  toolbar?: ReactNode;
  notice?: ReactNode;
  children: ReactNode;
};

export function ReportPageShell({
  dealerId,
  activeTab,
  nav,
  title,
  decision,
  metrics,
  metricsLoading,
  metricsColumns,
  onRefresh,
  refreshing,
  lastRefresh,
  toolbar,
  notice,
  children,
}: Props) {
  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={onRefresh}
      refreshing={refreshing}
      lastRefresh={lastRefresh}
      hideDealerId
    >
      <nav className="mb-4" aria-label="Report breadcrumb">
        <button
          type="button"
          onClick={() => { window.location.hash = reportHubHash(dealerId); }}
          className="text-xs font-semibold text-navy-700 hover:text-navy-900 hover:underline"
        >
          {operatorCopy.reports.title}
        </button>
        <span className="text-xs text-ink-faint mx-2" aria-hidden>/</span>
        <span className="text-xs font-medium text-ink-muted">{title}</span>
      </nav>

      <header className="mb-5 max-w-3xl">
        <h1 className="text-xl font-bold text-ink-heading tracking-tight">{title}</h1>
        <p className="text-sm text-ink-muted mt-2 leading-relaxed">{decision}</p>
      </header>

      {toolbar}

      {metrics && metrics.length > 0 && (
        <div className="mb-5">
          <ReportSummaryMetrics items={metrics} loading={metricsLoading || refreshing} columns={metricsColumns} />
        </div>
      )}

      {notice && <div className="mb-5">{notice}</div>}

      {children}
    </OperatorPage>
  );
}
