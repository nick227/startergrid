import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { findReport, isReportShipped, type ReportRangePreset } from '@/lib/reportsCatalog.ts';
import ReportsHubPage from '@/pages/ReportsHubPage.tsx';
import MovementReportPage from '@/pages/reports/MovementReportPage.tsx';
import ReadinessReportPage from '@/pages/reports/ReadinessReportPage.tsx';
import ExposureReportPage from '@/pages/reports/ExposureReportPage.tsx';
import EngagementReportPage from '@/pages/reports/EngagementReportPage.tsx';
import ThroughputReportPage from '@/pages/reports/ThroughputReportPage.tsx';
import ObservedDemandReportPage from '@/pages/reports/ObservedDemandReportPage.tsx';
import SyncActivityReportPage from '@/pages/reports/SyncActivityReportPage.tsx';
import LifecycleReportPage from '@/pages/reports/LifecycleReportPage.tsx';
import MerchandisingReportPage from '@/pages/reports/MerchandisingReportPage.tsx';
import VelocityReportPage from '@/pages/reports/VelocityReportPage.tsx';
import ReportComingSoonPage from '@/pages/reports/ReportComingSoonPage.tsx';

type Props = OperatorPageBaseProps & {
  reportSlug: string | null;
  reportRange: ReportRangePreset;
};

export default function ReportsRouter({ dealerId, nav, activeTab, reportSlug, reportRange }: Props) {
  if (!reportSlug) return <ReportsHubPage dealerId={dealerId} nav={nav} activeTab={activeTab} />;

  const def = findReport(reportSlug);
  if (!def || !isReportShipped(def)) {
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
    case 'throughput':
      return (
        <ThroughputReportPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
          reportRange={reportRange}
        />
      );
    case 'demand':
      return (
        <ObservedDemandReportPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
          reportRange={reportRange}
        />
      );
    case 'sync-summary':
      return (
        <SyncActivityReportPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
          reportRange={reportRange}
        />
      );
    case 'lifecycle':
      return (
        <LifecycleReportPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
          reportRange={reportRange}
        />
      );
    case 'merchandising':
      return (
        <MerchandisingReportPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
          reportRange={reportRange}
        />
      );
    case 'velocity':
      return (
        <VelocityReportPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
          reportRange={reportRange}
        />
      );
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
