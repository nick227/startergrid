import { PageShell } from './PageShell.tsx';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useDealerSummary } from '@/hooks/useDealerSummary.ts';

type Props = OperatorPageBaseProps & {
  dealerName?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastRefresh?: Date;
  headerAction?: React.ReactNode;
  footerPad?: boolean;
  hideDealerId?: boolean;
  sectionLabel?: string;
  children: React.ReactNode;
};

export function OperatorPage({
  dealerId,
  dealerName,
  activeTab,
  nav,
  onRefresh,
  refreshing,
  lastRefresh,
  headerAction,
  footerPad,
  hideDealerId,
  sectionLabel,
  children,
}: Props) {
  const dealerSummary = useDealerSummary(dealerId);
  const resolvedDealerName = dealerName ?? dealerSummary?.legalName ?? null;

  return (
    <PageShell
      dealerId={dealerId}
      dealerName={resolvedDealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={onRefresh}
      refreshing={refreshing}
      lastRefresh={lastRefresh}
      headerAction={headerAction}
      footerPad={footerPad}
      hideDealerId={hideDealerId}
      sectionLabel={sectionLabel}
    >
      {children}
    </PageShell>
  );
}
