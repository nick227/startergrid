import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useReportsData } from '@/hooks/useReportsData.ts';
import { ControlBlock } from '@/components/layout';
import { FilterChips } from '@/components/generic';
import { EmptyState } from '@/components/ui';
import { ReadinessAssetList } from '@/components/reports/ReadinessAssetList.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { findReport } from '@/lib/reportsCatalog.ts';
import {
  filterReadinessRows,
  readinessCounts,
  topIssueSummary,
  type ReadinessFilter,
} from '@/lib/reportPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps;

const READINESS_FILTERS: Array<{ key: ReadinessFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'warning', label: 'Warning' },
  { key: 'ready', label: 'Ready' },
];

export default function ReadinessReportPage({ dealerId, nav, activeTab }: Props) {
  const copy = reportCatalogCopy(findReport('readiness')!);
  const { publish, reload } = useReportsData(dealerId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReadinessFilter>('blocked');

  const details = publish.data?.vehicles.details ?? [];
  const counts = publish.data ? readinessCounts(publish.data.vehicles) : null;
  const visible = useMemo(
    () => filterReadinessRows(details, filter, search),
    [details, filter, search],
  );

  const situation = counts
    ? `${copy.decision} · ${counts.blocked} blocked · ${counts.warning} warning · top: ${topIssueSummary(details)}`
    : copy.decision;

  return (
    <ReportPageShell
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      title={copy.title}
      line={situation}
      onRefresh={reload}
      refreshing={publish.loading}
      lastRefresh={publish.lastRefresh ?? undefined}
      toolbar={<ReportTimeRangeBar value="now" snapshotOnly onChange={() => {}} />}
    >
      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.reports.searchReadiness}
        onRefresh={reload}
        refreshing={publish.loading}
        filters={
          <FilterChips
            chips={READINESS_FILTERS}
            activeKey={filter}
            onSelect={key => setFilter(key as ReadinessFilter)}
          />
        }
      />

      <ReadinessAssetList
        rows={visible}
        nav={nav}
        loading={publish.loading && !publish.data}
        emptyState={
          <EmptyState
            icon="✓"
            title="No assets match"
            subtitle="Try clearing filters or check Inventory for the full catalog."
          />
        }
      />
    </ReportPageShell>
  );
}
