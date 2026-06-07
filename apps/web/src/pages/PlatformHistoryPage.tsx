import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { OperatorPage } from '@/components/operator';
import { PageSituation } from '@/components/layout';

type Props = OperatorPageBaseProps & {
  platformSlug: string;
  platformName?: string;
};

export default function PlatformHistoryPage({ dealerId, nav, activeTab, platformSlug, platformName }: Props) {
  const label = platformName ?? platformSlug;
  return (
    <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} hideDealerId sectionLabel={label}>
      <PageSituation
        title={label}
        line="Activity and performance for this listing site."
      />
      <p className="text-sm text-ink-muted mb-4">
        <button type="button" onClick={nav.goToPlatforms} className="text-navy-600 hover:underline">
          ← All platforms
        </button>
      </p>
      <p className="text-sm text-ink-muted">Platform history view — next sprint.</p>
    </OperatorPage>
  );
}
