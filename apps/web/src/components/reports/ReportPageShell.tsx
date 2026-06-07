import type { ReactNode } from 'react';
import type { OperatorNavHandlers, OperatorTab } from '@/lib/operatorNav.ts';
import { OperatorPage } from '@/components/operator';
import { PageSituation } from '@/components/layout';
import { reportHubHash } from '@/lib/reportRoutes.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = {
  dealerId: string;
  activeTab: OperatorTab;
  nav: OperatorNavHandlers;
  title: string;
  line: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastRefresh?: string;
  toolbar?: ReactNode;
  children: ReactNode;
};

export function ReportPageShell({
  dealerId,
  activeTab,
  nav,
  title,
  line,
  onRefresh,
  refreshing,
  lastRefresh,
  toolbar,
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
      <p className="text-sm text-ink-muted mb-3">
        <button
          type="button"
          onClick={() => { window.location.hash = reportHubHash(dealerId); }}
          className="text-navy-600 hover:underline"
        >
          {operatorCopy.reports.backToHub}
        </button>
      </p>
      <PageSituation title={title} line={line} />
      {toolbar}
      {children}
    </OperatorPage>
  );
}
