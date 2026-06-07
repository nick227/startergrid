import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { findReport } from '@/lib/reportsCatalog.ts';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps & { slug: string };

export default function ReportComingSoonPage({ dealerId, nav, activeTab, slug }: Props) {
  const def = findReport(slug);
  const copy = def ? reportCatalogCopy(def) : null;

  return (
    <ReportPageShell
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      title={copy?.title ?? 'Report'}
      decision={copy?.decision ?? operatorCopy.reports.subtitle}
    >
      <p className="text-sm text-ink-muted py-8 text-center">{operatorCopy.reports.comingSoon}</p>
    </ReportPageShell>
  );
}
