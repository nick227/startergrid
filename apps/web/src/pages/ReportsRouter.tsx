import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { findReport } from '@/lib/reportsCatalog.ts';
import ReportsHubPage from '@/pages/ReportsHubPage.tsx';
import MovementReportPage from '@/pages/reports/MovementReportPage.tsx';
import ReadinessReportPage from '@/pages/reports/ReadinessReportPage.tsx';
import ExposureReportPage from '@/pages/reports/ExposureReportPage.tsx';
import EngagementReportPage from '@/pages/reports/EngagementReportPage.tsx';
import ReportComingSoonPage from '@/pages/reports/ReportComingSoonPage.tsx';

type Props = OperatorPageBaseProps & {
  reportSlug: string | null;
};

export default function ReportsRouter({ dealerId, nav, activeTab, reportSlug }: Props) {
  if (!reportSlug) return <ReportsHubPage dealerId={dealerId} nav={nav} activeTab={activeTab} />;

  const def = findReport(reportSlug);
  if (!def || def.phase !== 1) {
    return (
      <ReportComingSoonPage
        dealerId={dealerId}
        nav={nav}
        activeTab={activeTab}
        slug={reportSlug}
      />
    );
  }

  switch (reportSlug) {
    case 'movement':
      return <MovementReportPage dealerId={dealerId} nav={nav} activeTab={activeTab} />;
    case 'readiness':
      return <ReadinessReportPage dealerId={dealerId} nav={nav} activeTab={activeTab} />;
    case 'exposure':
      return <ExposureReportPage dealerId={dealerId} nav={nav} activeTab={activeTab} />;
    case 'engagement':
      return <EngagementReportPage dealerId={dealerId} nav={nav} activeTab={activeTab} />;
    default:
      return (
        <ReportComingSoonPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
          slug={reportSlug}
        />
      );
  }
}
